import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrdersFilterInput,
  OrdersPaginationInput,
  OrdersResponse,
} from './graphql/order.type';

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const MAX_LIMIT = 50;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  private readonly orderRelations = ['items', 'items.product'] as const;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async findWithPagination(
    userId?: string,
    offset = 0,
    limit = 10,
  ): Promise<{
    data: Order[];
    meta: { total: number; offset: number; limit: number };
  }> {
    const where = userId ? { user: { id: userId } } : undefined;
    const [data, total] = await this.orderRepository.findAndCount({
      where,
      relations: [...this.orderRelations],
      order: { id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return {
      data,
      meta: { total, offset, limit },
    };
  }

  async findAll(
    filter?: OrdersFilterInput,
    pagination?: OrdersPaginationInput,
  ): Promise<OrdersResponse> {
    return this.findOrders(filter, pagination);
  }

  async findOrders(
    filter?: OrdersFilterInput,
    pagination?: OrdersPaginationInput,
  ): Promise<OrdersResponse> {
    const offset =
      pagination?.offset !== undefined ? pagination.offset : DEFAULT_OFFSET;
    let limit =
      pagination?.limit !== undefined ? pagination.limit : DEFAULT_LIMIT;

    if (offset < 0 || (typeof limit === 'number' && limit < 0)) {
      throw new BadRequestException(
        'offset and limit must be non-negative',
      );
    }

    if (
      filter?.dateFrom &&
      filter?.dateTo &&
      new Date(filter.dateFrom) > new Date(filter.dateTo)
    ) {
      throw new BadRequestException(
        'dateFrom cannot be greater than dateTo',
      );
    }

    if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT;
    }

    if (limit <= 0) {
      limit = DEFAULT_LIMIT;
    }

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.id', 'ASC');

    if (filter?.status !== undefined && filter.status !== null) {
      qb.andWhere('order.status = :status', { status: filter.status });
    }

    if (filter?.dateFrom !== undefined && filter.dateFrom !== null) {
      qb.andWhere('order.createdAt >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter?.dateTo !== undefined && filter.dateTo !== null) {
      qb.andWhere('order.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    if (filter?.userId !== undefined && filter.userId !== null) {
      qb.andWhere('order.user_id = :userId', { userId: filter.userId });
    }

    qb.skip(offset).take(limit);

    try {
      const [data, total] = await qb.getManyAndCount();
      return {
        data,
        meta: { total, offset, limit },
      };
    } catch (e) {
      if (
        e instanceof BadRequestException ||
        e instanceof ConflictException ||
        e instanceof NotFoundException
      ) {
        throw e;
      }
      this.logger.error('findOrders failed', {
        error: e instanceof Error ? e.message : String(e),
      });
      throw new InternalServerErrorException();
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [...this.orderRelations],
    });

    if (!order) throw new NotFoundException(`Order with id ${id} not found`);

    return order;
  }

  async createOrder(
    dto: CreateOrderDto,
    userId: string,
    idempotencyKey: string,
  ): Promise<Order> {
    const existing = await this.orderRepository.findOne({
      where: { idempotencyKey },
      relations: [...this.orderRelations],
    });

    if (existing) {
      this.logger.log('Returning existing order for idempotency key', {
        orderId: existing.id,
        idempotencyKey,
        userId,
      });

      return existing;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let orderId: string | undefined;

    try {
      this.logger.log('Creating new order', {
        userId,
        idempotencyKey,
        itemCount: dto.items.length,
      });

      const productIds = [
        ...new Set(dto.items.map((item) => item.productId)),
      ].sort();
      const lockedProducts = await queryRunner.manager.find(Product, {
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' },
      });
      const productMap = new Map<string, Product>(
        lockedProducts.map((p) => [p.id, p]),
      );

      const quantityByProductId = new Map<string, number>();
      for (const item of dto.items) {
        const prev = quantityByProductId.get(item.productId) ?? 0;
        quantityByProductId.set(item.productId, prev + item.quantity);
      }

      let calculatedTotal = 0;
      for (const [pid, requestedQty] of quantityByProductId) {
        const product = productMap.get(pid);
        if (!product) {
          throw new NotFoundException(`Product with id ${pid} not found`);
        }

        if (product.stock < requestedQty) {
          this.logger.warn('Insufficient stock for product', {
            productId: pid,
            requested: requestedQty,
            available: product.stock,
          });
          throw new ConflictException(
            `Insufficient stock for product ${pid}: requested ${requestedQty}, available ${product.stock}`,
          );
        }

        calculatedTotal += product.price * requestedQty;
      }

      const order = queryRunner.manager.create(Order, {
        user: { id: userId },
        idempotencyKey,
        total: calculatedTotal,
      });

      await queryRunner.manager.save(order);
      orderId = order.id;

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        product.stock -= item.quantity;

        await queryRunner.manager.save(product);

        const orderItem = queryRunner.manager.create(OrderItem, {
          order,
          productId: product.id,
          product,
          quantity: item.quantity,
          price: product.price,
        });

        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();

      if (e instanceof QueryFailedError) {
        const driverError = e.driverError as { code?: string } | undefined;
        const code = driverError?.code;
        if (code === '23505') {
          const existingOrder = await this.orderRepository.findOne({
            where: { idempotencyKey },
            relations: [...this.orderRelations],
          });

          if (existingOrder) {
            this.logger.log(
              'Duplicate idempotency key, returning existing order',
              {
                orderId: existingOrder.id,
                idempotencyKey,
              },
            );

            return existingOrder;
          }

          this.logger.warn('Unique violation (23505) but order not found', {
            idempotencyKey,
            userId,
          });
          throw new ConflictException(
            'Duplicate idempotency key; order may have been created by another request',
          );
        }
      }

      if (
        e instanceof ConflictException ||
        e instanceof NotFoundException ||
        e instanceof BadRequestException
      ) {
        throw e;
      }

      this.logger.error('Order creation failed', {
        error: e instanceof Error ? e.message : String(e),
        userId,
        idempotencyKey,
        stack: e instanceof Error ? e.stack : undefined,
      });
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId! },
      relations: [...this.orderRelations],
    });

    if (!order) {
      this.logger.error('Order not found after commit', {
        orderId,
        userId,
        idempotencyKey,
      });

      throw new InternalServerErrorException();
    }

    return order;
  }
}

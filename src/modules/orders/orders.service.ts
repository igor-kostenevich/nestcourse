import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async createOrder(
    dto: CreateOrderDto,
    userId: string,
    idempotencyKey: string,
  ): Promise<Order> {
    const existing = await this.orderRepository.findOne({
      where: { idempotencyKey },
      relations: ['items', 'items.product'],
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

    let orderId: string;

    try {
      this.logger.log('Creating new order', {
        userId,
        idempotencyKey,
        itemCount: dto.items.length,
      });

      let calculatedTotal = 0;
      const products: Product[] = [];

      for (const item of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          this.logger.warn('Insufficient stock for product', {
            productId: item.productId,
            requested: item.quantity,
            available: product.stock,
          });
          throw new HttpException('Insufficient stock', 409);
        }
        calculatedTotal += product.price * item.quantity;
        products.push(product);
      }

      const order = queryRunner.manager.create(Order, {
        user: { id: userId },
        idempotencyKey,
        total: calculatedTotal,
      });
      await queryRunner.manager.save(order);
      orderId = order.id;

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const product = products[i];

        product.stock -= item.quantity;
        await queryRunner.manager.save(product);

        const orderItem = queryRunner.manager.create(OrderItem, {
          order,
          product,
          quantity: item.quantity,
          price: product.price,
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      if (e instanceof HttpException) {
        throw e;
      }
      this.logger.error('Order creation failed during transaction', {
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
      where: { id: orderId },
      relations: ['items', 'items.product'],
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

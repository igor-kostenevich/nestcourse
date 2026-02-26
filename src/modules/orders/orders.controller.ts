import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? 10;
    return this.ordersService.findWithPagination(userId, offset, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const userId =
      dto.userId ?? this.configService.get<string>('devUserId') ?? null;
    if (!userId) {
      throw new BadRequestException(
        'userId is required when DEV_USER_ID is not configured',
      );
    }
    const idempotencyKey =
      idempotencyKeyHeader ?? dto.idempotencyKey ?? randomUUID();
    return this.ordersService.createOrder(dto, userId, idempotencyKey);
  }
}

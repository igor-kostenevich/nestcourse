import { Controller, Post, Body, Headers } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    const idempotencyKey =
      idempotencyKeyHeader ?? dto.idempotencyKey ?? randomUUID();
    return this.ordersService.createOrder(dto, dto.userId, idempotencyKey);
  }
}

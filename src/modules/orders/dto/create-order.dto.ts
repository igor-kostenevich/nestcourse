export class CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export class CreateOrderDto {
  userId: string;
  items: CreateOrderItemDto[];
  idempotencyKey?: string;
}

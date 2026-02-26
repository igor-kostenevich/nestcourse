import {
  Field,
  Float,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Product } from '../../products/graphql/product.type';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Order status',
});

@ObjectType()
export class OrderItem {
  @Field(() => ID, { nullable: false })
  id: string;

  @Field(() => Int, { nullable: false })
  quantity: number;

  @Field(() => Int, { nullable: false })
  price: number;

  @Field(() => Product, { nullable: false })
  product: Product;
}

@ObjectType()
export class Order {
  @Field(() => ID, { nullable: false })
  id: string;

  @Field(() => String, { nullable: false })
  idempotencyKey: string;

  @Field(() => OrderStatus, { nullable: false })
  status: OrderStatus;

  @Field(() => Float, { nullable: false })
  total: number;

  @Field(() => Date, { nullable: false })
  createdAt: Date;

  @Field(() => Date, { nullable: false })
  updatedAt: Date;

  @Field(() => [OrderItem], { nullable: false })
  items: OrderItem[];
}

@InputType()
export class OrdersFilterInput {
  @Field(() => OrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

@InputType()
export class OrdersPaginationInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

@ObjectType()
export class OrdersMeta {
  @Field(() => Int, { nullable: false })
  total: number;

  @Field(() => Int, { nullable: false })
  offset: number;

  @Field(() => Int, { nullable: false })
  limit: number;
}

@ObjectType()
export class OrdersResponse {
  @Field(() => [Order], { nullable: false })
  data: Order[];

  @Field(() => OrdersMeta, { nullable: false })
  meta: OrdersMeta;
}

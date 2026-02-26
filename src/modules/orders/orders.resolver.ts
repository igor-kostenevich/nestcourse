import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  Args,
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  Order,
  OrderItem,
  OrdersFilterInput,
  OrdersPaginationInput,
  OrdersResponse,
} from './graphql/order.type';
import { OrdersService } from './orders.service';
import { Product } from '../products/graphql/product.type';

@Resolver(() => Order)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => OrdersResponse)
  @UsePipes(ValidationPipe)
  orders(
    @Args('filter', { nullable: true }) filter?: OrdersFilterInput,
    @Args('pagination', { nullable: true }) pagination?: OrdersPaginationInput,
  ): Promise<OrdersResponse> {
    return this.ordersService.findAll(filter, pagination);
  }

  @ResolveField(() => [OrderItem])
  items(@Parent() order: Order & { items?: OrderItem[] }): OrderItem[] {
    return order.items ?? [];
  }
}

@Resolver(() => OrderItem)
export class OrderItemResolver {
  @ResolveField(() => Product)
  product(
    @Parent() item: OrderItem & { productId: string },
    @Context() ctx: { productLoader?: { load: (id: string) => Promise<Product> } },
  ): Promise<Product> {
    return ctx.productLoader!.load(item.productId);
  }
}

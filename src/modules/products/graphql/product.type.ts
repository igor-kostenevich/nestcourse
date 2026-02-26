import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Product {
  @Field(() => ID, { nullable: false })
  id: string;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Int, { nullable: false })
  price: number;

  @Field(() => Int, { nullable: false })
  stock: number;
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as DataLoader from 'dataloader';
import { appConfig } from './config/app.config';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { GraphqlModule } from './graphql/graphql.module';
import { ProductsService } from './modules/products/products.service';
import { Product } from './modules/products/product.entity';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ProductsModule],
      inject: [ProductsService],
      useFactory: (productsService: ProductsService) => ({
        autoSchemaFile: true,
        context: ({ req }) => ({
          req,
          productLoader: new DataLoader<string, Product>(async (ids: readonly string[]) => {
            const products = await productsService.findByIds([...ids]);
            const map = new Map(products.map((p) => [p.id, p]));
            return ids.map((id) => {
              const product = map.get(id);
              return product ?? new Error(`Product not found: ${id}`);
            });
          }),
        }),
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
        logging: ['query'],
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    ProductsModule,
    OrdersModule,
    GraphqlModule,
  ],
})
export class AppModule {}

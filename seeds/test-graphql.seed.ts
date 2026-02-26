/**
 * Тестовий seed для перевірки GraphQL (продукти + ордери з items).
 * Підключається до БД через існуючу TypeORM конфігурацію.
 * Запуск: npm run seed:graphql
 */
import dataSource from '../typeorm.config';
import { Product } from '../src/modules/products/product.entity';
import { Order } from '../src/modules/orders/order.entity';
import { OrderItem } from '../src/modules/orders/order-item.entity';
import { User } from '../src/modules/users/user.entity';
import { OrderStatus } from '../src/modules/orders/order.entity';
import { DEV_USER_ID } from '../src/config/app.config';

const PRODUCTS_SEED = [
  { name: 'Ноутбук', price: 35000, stock: 10 },
  { name: 'Мишка', price: 450, stock: 100 },
  { name: 'Клавіатура', price: 1200, stock: 50 },
  { name: 'Монітор 24"', price: 8500, stock: 20 },
  { name: 'Навушники', price: 800, stock: 75 },
];

const IDEMPOTENCY_KEYS = [
  'seed-graphql-order-001',
  'seed-graphql-order-002',
  'seed-graphql-order-003',
];

async function run(): Promise<void> {
  await dataSource.initialize();

  const productRepo = dataSource.getRepository(Product);
  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);

  const user = await dataSource.getRepository(User).findOne({ where: { id: DEV_USER_ID } });
  if (!user) {
    throw new Error(`Dev user not found (id: ${DEV_USER_ID}). Run migrations first.`);
  }

  console.log('Creating products...');
  const products: Product[] = [];
  for (const p of PRODUCTS_SEED) {
    const product = productRepo.create(p);
    const saved = await productRepo.save(product);
    products.push(saved);
    console.log(`  - ${saved.name} (id: ${saved.id}, price: ${saved.price}, stock: ${saved.stock})`);
  }

  console.log('Creating orders with items...');
  const ordersSeed: Array<{ productIndex: number; quantity: number }[]> = [
    [
      { productIndex: 0, quantity: 1 },
      { productIndex: 1, quantity: 2 },
      { productIndex: 2, quantity: 1 },
    ],
    [
      { productIndex: 2, quantity: 3 },
      { productIndex: 3, quantity: 1 },
    ],
    [
      { productIndex: 4, quantity: 2 },
      { productIndex: 1, quantity: 1 },
      { productIndex: 0, quantity: 1 },
    ],
  ];

  for (let i = 0; i < ordersSeed.length; i++) {
    const itemsSpec = ordersSeed[i];
    let total = 0;
    const items: OrderItem[] = [];

    for (const { productIndex, quantity } of itemsSpec) {
      const product = products[productIndex];
      const price = product.price;
      total += quantity * price;
      const item = orderItemRepo.create({
        productId: product.id,
        product,
        quantity,
        price,
      });
      items.push(item);
    }

    const order = orderRepo.create({
      idempotencyKey: IDEMPOTENCY_KEYS[i],
      user,
      status: OrderStatus.PENDING,
      total: Math.round(total * 100) / 100,
    });
    const savedOrder = await orderRepo.save(order);

    for (const item of items) {
      item.order = savedOrder;
      await orderItemRepo.save(item);
    }

    console.log(
      `  - Order ${i + 1} (id: ${savedOrder.id}, total: ${savedOrder.total}, items: ${items.length})`,
    );
  }

  await dataSource.destroy();
  console.log('Seed completed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

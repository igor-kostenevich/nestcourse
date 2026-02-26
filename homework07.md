# Homework 07

## Підхід до GraphQL-схеми

Використано **code-first**: типи, enum-и та input-и описані в TypeScript за допомогою декораторів `@nestjs/graphql` (`@ObjectType`, `@Field`, `@InputType`, `registerEnumType`), схема генерується автоматично (`autoSchemaFile: true`). Обрано code-first, щоб тримати один джерело правди з доменними сутностями та DTO, уникнути розсинхрону з .graphql файлами та мати типобезпечні резолвери.

## Реалізація запиту `orders`

Резолвер лише приймає аргументи та делегує в сервіс: `ordersService.findAll(filter, pagination)`. Вся логіка фільтрації (status, dateFrom, dateTo, userId) та пагінації (limit, offset, валідація) реалізована в `OrdersService.findOrders()`. Повертається тип `OrdersResponse` з полями `data` (масив замовлень) та `meta` (total, offset, limit).

## Пагінація

Обрано варіант з аргументами та метаданими: `orders(filter, pagination)` повертає `OrdersResponse { data: [Order!]!, meta: { total, offset, limit } }`. Це достатньо для списку замовлень у адмінці/звітах без cursor-based навігації.

## Перевірка роботи GraphQL

Endpoint: `POST /graphql`. Для перевірки достатньо виконати smoke-запит: `query { hello }` (резолвер повертає рядок `"Hello"`). Apollo Sandbox / Explorer відкривається за тим самим URL.

---

## Тестові дані

- **Як запустити seed:**
  - Якщо проект запущено в Docker (API + БД): **`npm run seed:graphql:docker`** — seed виконається всередині контейнера (хост `db` доступний).
  - Якщо БД локально (localhost): **`npm run seed:graphql`**.

- **Які продукти та ордери додаються (короткий список):**
  - **Продукти (5):** Ноутбук (35000), Мишка (450), Клавіатура (1200), Монітор 24" (8500), Навушники (800).
  - **Ордери (3):**
    1. Ордер 1: 1× Ноутбук, 2× Мишка, 1× Клавіатура — total за рахунком quantity × price.
    2. Ордер 2: 3× Клавіатура, 1× Монітор 24".
    3. Ордер 3: 2× Навушники, 1× Мишка, 1× Ноутбук.
  - У кожного ордера унікальний `idempotencyKey` (seed-graphql-order-001, 002, 003). У кожного item заповнені `productId` та `product` для роботи DataLoader.

- **Після виконання seed можна виконувати GraphQL-запит:**

```graphql
query {
  orders {
    data {
      id
      total
      items {
        quantity
        product {
          id
          name
          price
        }
      }
    }
  }
}
```


## Усунення N+1 для OrderItem.product

### До DataLoader — N+1 запитів

Для тесту було додано тимчасове поле `productNoLoader`, яке напряму викликало `ProductsService.findOne(productId)` у резолвері `OrderItem`.

При запиті:

```graphql
query OrdersWithProductNoLoader {
  orders(pagination: { limit: 5 }) {
    data {
      id
      items {
        id
        quantity
        productNoLoader {
          id
          name
        }
      }
    }
  }
}
```

```sql
-- 1) Завантаження orders + items
query: SELECT DISTINCT "distinctAlias"."order_id" AS "ids_order_id", "distinctAlias"."order_id"
FROM (
  SELECT "order"."id" AS "order_id",
         "order"."idempotency_key" AS "order_idempotency_key",
         "order"."status" AS "order_status",
         "order"."total" AS "order_total",
         "order"."created_at" AS "order_created_at",
         "order"."updated_at" AS "order_updated_at",
         "order"."user_id" AS "order_user_id",
         "items"."id" AS "items_id",
         "items"."product_id" AS "items_product_id",
         "items"."quantity" AS "items_quantity",
         "items"."price" AS "items_price",
         "items"."order_id" AS "items_order_id"
  FROM "orders" "order"
  LEFT JOIN "order_items" "items" ON "items"."order_id"="order"."id"
) "distinctAlias"
ORDER BY "distinctAlias"."order_id" ASC, "order_id" ASC
LIMIT 5 OFFSET 0

query: SELECT "order"."id" AS "order_id",
               "order"."idempotency_key" AS "order_idempotency_key",
               "order"."status" AS "order_status",
               "order"."total" AS "order_total",
               "order"."created_at" AS "order_created_at",
               "order"."updated_at" AS "order_updated_at",
               "order"."user_id" AS "order_user_id",
               "items"."id" AS "items_id",
               "items"."product_id" AS "items_product_id",
               "items"."quantity" AS "items_quantity",
               "items"."price" AS "items_price",
               "items"."order_id" AS "items_order_id"
FROM "orders" "order"
LEFT JOIN "order_items" "items" ON "items"."order_id"="order"."id"
WHERE "order"."id" IN ($1, $2, $3)
ORDER BY "order"."id" ASC
-- PARAMETERS: ["7c2ca2fb-3bfe-4d90-b0c7-3e73a232822a","878c82b9-7821-4add-b48b-a562d701d185","953837d8-3544-4e3f-a941-be52c2607e63"]
```

```sql
-- ❗ Далі видно N+1: 8 окремих запитів SELECT по одному productId кожен:

query: SELECT "Product"."id", "Product"."name", "Product"."price", "Product"."stock"
FROM "products" "Product"
WHERE (("Product"."id" = $1)) LIMIT 1
-- PARAMETERS: ["62d7608a-204f-4465-a457-d84df2501a75"]

query: SELECT ... WHERE ("Product"."id" = $1) LIMIT 1
-- PARAMETERS: ["31477b58-7a94-49a0-bc17-3fe3b5b9620a"]

query: SELECT ... WHERE ("Product"."id" = $1) LIMIT 1
-- PARAMETERS: ["62d7608a-204f-4465-a457-d84df2501a75"]

query: SELECT ... WHERE ("Product"."id" = $1) LIMIT 1
-- PARAMETERS: ["cab0cf6a-44c2-48ec-9bf2-7e606d3191ad"]

query: SELECT ... WHERE ("Product"."id" = $1) LIMIT 1
-- PARAMETERS: ["6b7157c7-1a3f-4492-abcc-3e0a22a14974"]

query: SELECT ... WHERE ("Product"."id" = $1) LIMIT 1
-- PARAMETERS: ["ac8605fb-cfbc-4821-bf75-d2668158a4c8"]

query: SELECT ... WHERE ("Product"."id" = $1) LIMIT 1
-- PARAMETERS: ["ac8605fb-cfbc-4821-bf75-d2668158a4c8"]

query: SELECT ... WHERE ("Product"."id" = $1) LIMIT 1
-- PARAMETERS: ["cab0cf6a-44c2-48ec-9bf2-7e606d3191ad"]
```

### Після DataLoader — один batched-запит

Поле product використовує DataLoader, який збирає всі productId у межах одного GraphQL request та виконує один запит з WHERE id IN (...).

```graphql
query OrdersWithProductLoader {
  orders(pagination: { limit: 5 }) {
    data {
      id
      items {
        id
        quantity
        product {
          id
          name
          price
        }
      }
    }
  }
}
```

```sql
-- Orders + items
query: SELECT DISTINCT "distinctAlias"."order_id" AS "ids_order_id", "distinctAlias"."order_id"
FROM (...) "distinctAlias"
ORDER BY "distinctAlias"."order_id" ASC, "order_id" ASC
LIMIT 5 OFFSET 0

query: SELECT "order"."id", ..., "items"."product_id"
FROM "orders"
LEFT JOIN "order_items" ON "items"."order_id"="order"."id"
WHERE "order"."id" IN ($1, $2, $3)
ORDER BY "order"."id" ASC

-- ✔️ Один батч-запит на всі продукти:
query: SELECT "Product"."id", "Product"."name", "Product"."price", "Product"."stock"
FROM "products" "Product"
WHERE ("Product"."id" IN ($1, $2, $3, $4, $5))
-- PARAMETERS:
-- ["62d7608a-204f-4465-a457-d84df2501a75",
--  "6b7157c7-1a3f-4492-abcc-3e0a22a14974",
--  "cab0cf6a-44c2-48ec-9bf2-7e606d3191ad",
--  "ac8605fb-cfbc-4821-bf75-d2668158a4c8",
--  "31477b58-7a94-49a0-bc17-3fe3b5b9620a"]
```
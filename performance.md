## Запит

```sql
SELECT * FROM products WHERE name = 'test';
```

Відповідає пошуку продуктів за назвою (каталог, API типу `GET /products?name=...`). Запит «гарячий», бо викликається часто; без індексу по `name` PostgreSQL робить Seq Scan по всій таблиці — при зрості кількості товарів час виконання зростає. Індекс по `name` дає Index/Bitmap Index Scan і стабільну швидкість.

## BEFORE
```
Seq Scan on products  (cost=0.00..22.12 rows=5 width=56) (actual time=0.027..0.028 rows=5 loops=1)
  Filter: ((name)::text = 'test'::text)
  Rows Removed by Filter: 5
Planning Time: 1.068 ms
Execution Time: 0.143 ms
```

## AFTER
```
Bitmap Heap Scan on products  (cost=4.19..12.66 rows=5 width=56) (actual time=0.040..0.041 rows=5 loops=1)
  Recheck Cond: ((name)::text = 'test'::text)
  Heap Blocks: exact=1
  ->  Bitmap Index Scan on idx_products_name  (cost=0.00..4.19 rows=5 width=0) (actual time=0.037..0.037 rows=5 loops=1)
        Index Cond: ((name)::text = 'test'::text)
Planning Time: 0.211 ms
Execution Time: 0.108 ms
```

## Summary
BEFORE: planner примусово використовує Seq Scan (enable_indexscan/bitmapscan вимкнено). AFTER: planner обирає Bitmap Index Scan (індекс використовується), що ефективніше при пошуку за name.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1770497839220 implements MigrationInterface {
  name = 'AddIndexes1770497839220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_products_name" ON "products" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_items_product_id" ON "order_items" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_order_items_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_order_items_product_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_products_name"`);
  }
}

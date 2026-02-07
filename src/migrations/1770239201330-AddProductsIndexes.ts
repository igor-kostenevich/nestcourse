import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsIndexes1770239201330 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_products_name_lower" ON "products"(LOWER("name"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_price" ON "products"("price")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_name_lower"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_price"`);
  }
}

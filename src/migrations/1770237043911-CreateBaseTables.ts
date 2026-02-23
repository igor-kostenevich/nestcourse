import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBaseTables1770237043911 implements MigrationInterface {
  name = 'CreateBaseTables1770237043911';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "price" integer NOT NULL,
        "stock" integer NOT NULL,
        CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "idempotencyKey" character varying NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "UQ_1881ab845832ad82c4e45f5fe3b" UNIQUE ("idempotencyKey"),
        CONSTRAINT "PK_710e2d4957aa0568e2d23575018" PRIMARY KEY ("id"),
        CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "quantity" integer NOT NULL,
        "order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        CONSTRAINT "PK_d11ee340987234eafb250f6c335" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}

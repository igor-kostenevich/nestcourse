import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1770237643911 implements MigrationInterface {
    name = 'InitialSchema1770237643911'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" ADD "price" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "total" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "UQ_1881ab845832ad82c4e45f5fe3b"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "idempotencyKey"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "idempotencyKey" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "UQ_1881ab845832ad82c4e45f5fe3b" UNIQUE ("idempotencyKey")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "UQ_1881ab845832ad82c4e45f5fe3b"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "idempotencyKey"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "idempotencyKey" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "UQ_1881ab845832ad82c4e45f5fe3b" UNIQUE ("idempotencyKey")`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "total"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "price"`);
    }

}

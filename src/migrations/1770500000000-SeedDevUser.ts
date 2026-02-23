import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dev-користувач для створення замовлень без авторизації.
 */
const DEV_USER_ID = '11111111-1111-4111-a111-111111111111';

export class SeedDevUser1770500000000 implements MigrationInterface {
  name = 'SeedDevUser1770500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [DEV_USER_ID, 'dev@local.dev', 'Dev User'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE id = $1`, [DEV_USER_ID]);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TypeORM's @PrimaryGeneratedColumn('uuid') relies on the database to generate
 * the value (INSERT ... VALUES (DEFAULT, ...)). gen_random_uuid() is built into
 * PostgreSQL 13+, so no extension is required.
 */
export class AddUuidDefaultsToCreatorsAndUsers1760000000002
  implements MigrationInterface
{
  name = 'AddUuidDefaultsToCreatorsAndUsers1760000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "creators" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "creators" ALTER COLUMN "id" DROP DEFAULT`,
    );
  }
}

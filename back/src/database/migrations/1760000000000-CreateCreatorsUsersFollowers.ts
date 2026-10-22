import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCreatorsUsersFollowers1760000000000
  implements MigrationInterface
{
  name = 'CreateCreatorsUsersFollowers1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "creators" (
        "id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_creators_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "followers" (
        "creator_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_followers_creator_id_user_id" PRIMARY KEY ("creator_id", "user_id"),
        CONSTRAINT "FK_followers_creator_id" FOREIGN KEY ("creator_id")
          REFERENCES "creators"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_followers_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_followers_user_id" ON "followers" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_followers_user_id"`);
    await queryRunner.query(`DROP TABLE "followers"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "creators"`);
  }
}

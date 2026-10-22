import { MigrationInterface, QueryRunner } from 'typeorm';

const SEED_CREATORS = [
  {
    id: '5d3a9f2c-7e14-4b8a-9c01-2f6d8e4a7b10',
    name: 'Lia Monteiro',
  },
  {
    id: '9b1e6c47-2a85-4d3f-8e6b-7c0a5d2f9e21',
    name: 'Sofia Andrade',
  },
];

export class SeedCreators1760000000001 implements MigrationInterface {
  name = 'SeedCreators1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const creator of SEED_CREATORS) {
      await queryRunner.query(
        `
          INSERT INTO "creators" ("id", "name")
          VALUES ($1, $2)
          ON CONFLICT ("id") DO NOTHING
        `,
        [creator.id, creator.name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "creators" WHERE "id" = ANY($1::uuid[])`,
      [SEED_CREATORS.map((creator) => creator.id)],
    );
  }
}

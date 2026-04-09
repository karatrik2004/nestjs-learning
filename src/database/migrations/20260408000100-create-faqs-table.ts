import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFaqsTable20260408000100 implements MigrationInterface {
  name = 'CreateFaqsTable20260408000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "faqs" (
        "id" SERIAL NOT NULL,
        "question" character varying(255) NOT NULL,
        "answer" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_faqs_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "faqs"`);
  }
}


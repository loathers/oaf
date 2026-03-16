import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    ALTER TABLE "Daily"
    ADD COLUMN "thresholdReached" BOOLEAN NOT NULL DEFAULT true
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`
    ALTER TABLE "Daily"
    DROP COLUMN "thresholdReached"
  `.execute(db);
}

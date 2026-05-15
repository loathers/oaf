import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    ALTER TABLE "Player" ADD COLUMN "crowdsourcingIgnored" BOOLEAN NOT NULL DEFAULT false
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`
    ALTER TABLE "Player" DROP COLUMN "crowdsourcingIgnored"
  `.execute(db);
}

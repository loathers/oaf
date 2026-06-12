import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    ALTER TABLE "Iotm"
      ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'mr_accessory'
      CHECK ("currency" IN ('mr_accessory', 'uncle_buck'))
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`ALTER TABLE "Iotm" DROP COLUMN "currency"`.execute(db);
}

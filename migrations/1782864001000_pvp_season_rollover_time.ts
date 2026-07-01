import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    ALTER TABLE "PvpSeason"
    ALTER COLUMN "startDate" TYPE TIMESTAMPTZ
    USING ("startDate"::timestamp + interval '3 hours 30 minutes')
  `.execute(db);
}

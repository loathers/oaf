import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  // Strip zero-width spaces from existing data
  await sql`
    UPDATE "DailySubmission"
    SET "value" = REPLACE("value", E'\u200B', ''),
        "key" = REPLACE("key", E'\u200B', '')
    WHERE "value" LIKE E'%\u200B%' OR "key" LIKE E'%\u200B%'
  `.execute(db);

  await sql`
    UPDATE "Daily"
    SET "value" = REPLACE("value", E'\u200B', ''),
        "key" = REPLACE("key", E'\u200B', '')
    WHERE "value" LIKE E'%\u200B%' OR "key" LIKE E'%\u200B%'
  `.execute(db);

  // Add gameday column to DailySubmission, defaulting existing rows to today
  await sql`
    ALTER TABLE "DailySubmission"
    ADD COLUMN "gameday" INTEGER NOT NULL
    DEFAULT FLOOR(EXTRACT(EPOCH FROM (now() - TIMESTAMP '2003-02-01 03:30:00+00')) / 86400)
  `.execute(db);

  // Drop the default now that existing rows are populated
  await sql`
    ALTER TABLE "DailySubmission"
    ALTER COLUMN "gameday" DROP DEFAULT
  `.execute(db);

  // Replace the old unique constraint with one that includes gameday
  await sql`
    ALTER TABLE "DailySubmission"
    DROP CONSTRAINT "DailySubmission_key_playerId_key"
  `.execute(db);

  await sql`
    ALTER TABLE "DailySubmission"
    ADD CONSTRAINT "DailySubmission_key_playerId_gameday_key"
    UNIQUE ("key", "playerId", "gameday")
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`
    ALTER TABLE "DailySubmission"
    DROP CONSTRAINT "DailySubmission_key_playerId_gameday_key"
  `.execute(db);

  await sql`
    ALTER TABLE "DailySubmission"
    ADD CONSTRAINT "DailySubmission_key_playerId_key"
    UNIQUE ("key", "playerId")
  `.execute(db);

  await sql`
    ALTER TABLE "DailySubmission"
    DROP COLUMN "gameday"
  `.execute(db);
}

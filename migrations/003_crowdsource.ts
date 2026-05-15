import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    CREATE TABLE "Daily" (
      "key" TEXT NOT NULL,
      "gameday" INTEGER NOT NULL,
      "value" TEXT NOT NULL,
      PRIMARY KEY ("key", "gameday")
    )
  `.execute(db);

  await sql`
    CREATE TABLE "DailySubmission" (
      "key" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "playerId" INTEGER NOT NULL REFERENCES "Player" ("playerId"),
      "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE ("key", "playerId")
    )
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP TABLE IF EXISTS "DailySubmission"`.execute(db);
  await sql`DROP TABLE IF EXISTS "Daily"`.execute(db);
}

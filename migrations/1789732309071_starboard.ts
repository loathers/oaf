import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    CREATE TABLE "StarboardMessage" (
      "sourceMessageId" TEXT PRIMARY KEY,
      "sourceChannelId" TEXT NOT NULL,
      "starboardMessageId" TEXT,
      "score" INTEGER NOT NULL DEFAULT 0,
      "suppressed" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // Lets a deletion in the starboard channel be traced back to its source
  await sql`
    CREATE UNIQUE INDEX "StarboardMessage_starboardMessageId_key"
    ON "StarboardMessage" ("starboardMessageId")
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP TABLE "StarboardMessage"`.execute(db);
}

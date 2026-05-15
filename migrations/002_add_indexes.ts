import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  await sql`CREATE INDEX IF NOT EXISTS "Player_discordId_idx" ON "Player" ("discordId")`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS "RaidParticipation_playerId_idx" ON "RaidParticipation" ("playerId")`.execute(
    db,
  );
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP INDEX IF EXISTS "RaidParticipation_playerId_idx"`.execute(db);
  await sql`DROP INDEX IF EXISTS "Player_discordId_idx"`.execute(db);
}

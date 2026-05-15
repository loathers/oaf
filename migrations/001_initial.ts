import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<never>): Promise<void> {
  // Drop Prisma migrations table
  await sql`DROP TABLE IF EXISTS "_prisma_migrations"`.execute(db);

  // Player
  await sql`
    CREATE TABLE IF NOT EXISTS "Player" (
      "playerId" INTEGER PRIMARY KEY,
      "playerName" TEXT NOT NULL,
      "accountCreationDate" TIMESTAMPTZ,
      "doneWithSkills" BOOLEAN NOT NULL DEFAULT false,
      "brainiac" BOOLEAN NOT NULL DEFAULT false,
      "discordId" TEXT,
      "latitude" DOUBLE PRECISION,
      "longitude" DOUBLE PRECISION,
      "thiccEntered" BOOLEAN NOT NULL DEFAULT false,
      "thiccGifteeId" INTEGER UNIQUE
    )
  `.execute(db);

  // StandingOffer
  await sql`
    CREATE TABLE IF NOT EXISTS "StandingOffer" (
      "itemId" INTEGER NOT NULL,
      "price" BIGINT NOT NULL,
      "buyerId" INTEGER NOT NULL,
      "offeredAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "StandingOffer_buyerId_itemId_key" ON "StandingOffer" ("buyerId", "itemId")`.execute(
    db,
  );

  // Reminder
  await sql`
    CREATE TABLE IF NOT EXISTS "Reminder" (
      "id" SERIAL PRIMARY KEY,
      "guildId" TEXT,
      "channelId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "messageContents" TEXT NOT NULL,
      "reminderDate" TIMESTAMPTZ NOT NULL,
      "interactionReplyId" TEXT,
      "reminderSent" BOOLEAN NOT NULL DEFAULT false
    )
  `.execute(db);

  // Raid
  await sql`
    CREATE TABLE IF NOT EXISTS "Raid" (
      "id" INTEGER PRIMARY KEY,
      "clanId" INTEGER NOT NULL
    )
  `.execute(db);

  // RaidParticipation
  await sql`
    CREATE TABLE IF NOT EXISTS "RaidParticipation" (
      "raidId" INTEGER NOT NULL,
      "playerId" INTEGER NOT NULL,
      "skills" INTEGER NOT NULL,
      "kills" INTEGER NOT NULL
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "RaidParticipation_raidId_playerId_key" ON "RaidParticipation" ("raidId", "playerId")`.execute(
    db,
  );

  // Tag
  await sql`
    CREATE TABLE IF NOT EXISTS "Tag" (
      "tag" TEXT PRIMARY KEY,
      "reason" TEXT,
      "channelId" TEXT NOT NULL,
      "guildId" TEXT NOT NULL,
      "messageId" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "createdBy" TEXT NOT NULL
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "Tag_guildId_channelId_messageId_key" ON "Tag" ("guildId", "channelId", "messageId")`.execute(
    db,
  );

  // Setting
  await sql`
    CREATE TABLE IF NOT EXISTS "Setting" (
      "key" TEXT PRIMARY KEY,
      "value" JSONB NOT NULL
    )
  `.execute(db);

  // Raffle
  await sql`
    CREATE TABLE IF NOT EXISTS "Raffle" (
      "gameday" INTEGER PRIMARY KEY,
      "firstPrize" INTEGER NOT NULL,
      "secondPrize" INTEGER NOT NULL,
      "messageId" TEXT NOT NULL
    )
  `.execute(db);

  // RaffleWins
  await sql`
    CREATE TABLE IF NOT EXISTS "RaffleWins" (
      "gameday" INTEGER NOT NULL,
      "playerId" INTEGER NOT NULL,
      "place" INTEGER NOT NULL,
      "tickets" INTEGER NOT NULL
    )
  `.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "RaffleWins_gameday_playerId_key" ON "RaffleWins" ("gameday", "playerId")`.execute(
    db,
  );

  // FlowerPrices
  await sql`
    CREATE TABLE IF NOT EXISTS "FlowerPrices" (
      "id" SERIAL PRIMARY KEY,
      "red" INTEGER NOT NULL,
      "white" INTEGER NOT NULL,
      "blue" INTEGER NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  // FlowerPriceAlert
  await sql`
    CREATE TABLE IF NOT EXISTS "FlowerPriceAlert" (
      "playerId" INTEGER PRIMARY KEY,
      "price" INTEGER NOT NULL
    )
  `.execute(db);

  // Foreign keys (using DO blocks for idempotency)
  await sql`
    DO $$ BEGIN
      ALTER TABLE "Player" ADD CONSTRAINT "Player_thiccGifteeId_fkey"
        FOREIGN KEY ("thiccGifteeId") REFERENCES "Player"("playerId")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TABLE "StandingOffer" ADD CONSTRAINT "StandingOffer_buyerId_fkey"
        FOREIGN KEY ("buyerId") REFERENCES "Player"("playerId")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TABLE "RaidParticipation" ADD CONSTRAINT "RaidParticipation_raidId_fkey"
        FOREIGN KEY ("raidId") REFERENCES "Raid"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TABLE "RaidParticipation" ADD CONSTRAINT "RaidParticipation_playerId_fkey"
        FOREIGN KEY ("playerId") REFERENCES "Player"("playerId")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TABLE "RaffleWins" ADD CONSTRAINT "RaffleWins_gameday_fkey"
        FOREIGN KEY ("gameday") REFERENCES "Raffle"("gameday")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TABLE "RaffleWins" ADD CONSTRAINT "RaffleWins_playerId_fkey"
        FOREIGN KEY ("playerId") REFERENCES "Player"("playerId")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `.execute(db);

  await sql`
    DO $$ BEGIN
      ALTER TABLE "FlowerPriceAlert" ADD CONSTRAINT "FlowerPriceAlert_playerId_fkey"
        FOREIGN KEY ("playerId") REFERENCES "Player"("playerId")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `.execute(db);
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP TABLE IF EXISTS "FlowerPriceAlert"`.execute(db);
  await sql`DROP TABLE IF EXISTS "FlowerPrices"`.execute(db);
  await sql`DROP TABLE IF EXISTS "RaffleWins"`.execute(db);
  await sql`DROP TABLE IF EXISTS "Raffle"`.execute(db);
  await sql`DROP TABLE IF EXISTS "Setting"`.execute(db);
  await sql`DROP TABLE IF EXISTS "Tag"`.execute(db);
  await sql`DROP TABLE IF EXISTS "RaidParticipation"`.execute(db);
  await sql`DROP TABLE IF EXISTS "Raid"`.execute(db);
  await sql`DROP TABLE IF EXISTS "Reminder"`.execute(db);
  await sql`DROP TABLE IF EXISTS "StandingOffer"`.execute(db);
  await sql`DROP TABLE IF EXISTS "Player"`.execute(db);
}

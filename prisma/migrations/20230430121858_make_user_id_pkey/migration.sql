/*
  Warnings:

  - The primary key for the `players` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `user_id` to the `players` table without a default value. This is not possible if the table is not empty.

*/
-- Migrate user_ids from string to integer
UPDATE "players" SET "user_id" = floor(random() * -1000000 - 1)::text WHERE "user_id" = '' OR "user_id" is null;
ALTER TABLE "players" ADD COLUMN "playerId" INTEGER;
UPDATE "players" SET "playerId" = CAST("user_id" as INTEGER);

-- Deduplicate
DELETE FROM "players" o WHERE (SELECT COUNT(*) FROM "players" i WHERE i."playerId" = o."playerId") > 1 AND kills = 0;

-- AlterTable
ALTER TABLE "players" DROP CONSTRAINT "players_pkey",
DROP COLUMN "user_id",
ADD CONSTRAINT "username_unique" UNIQUE ("players_username_key"),
ADD CONSTRAINT "players_pkey" PRIMARY KEY ("playerId");

/*
  Warnings:

  - The primary key for the `players` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "players" DROP CONSTRAINT "players_pkey",
ADD COLUMN     "discord_id" TEXT,
ALTER COLUMN "username" SET DATA TYPE TEXT,
ALTER COLUMN "skills" SET DATA TYPE INTEGER,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "players_pkey" PRIMARY KEY ("username");

/*
  Warnings:

  - You are about to drop the column `kills` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `Player` table. All the data in the column will be lost.
  - Added the required column `clanId` to the `Raid` table without a default value. This is not possible if the table is not empty.

*/
-- Custom: Truncate Raid table since we need to rescan
TRUNCATE TABLE "Raid" CASCADE;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "kills",
DROP COLUMN "skills";

-- AlterTable
ALTER TABLE "Raid" ADD COLUMN     "clanId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "RaidParticipation" (
    "raidId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "skills" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidParticipation_raidId_playerId_key" ON "RaidParticipation"("raidId", "playerId");

-- AddForeignKey
ALTER TABLE "RaidParticipation" ADD CONSTRAINT "RaidParticipation_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidParticipation" ADD CONSTRAINT "RaidParticipation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("playerId") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `greenboxLastUpdate` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `greenboxString` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the `Greenbox` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Greenbox" DROP CONSTRAINT "Greenbox_playerId_fkey";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "greenboxLastUpdate",
DROP COLUMN "greenboxString";

-- DropTable
DROP TABLE "Greenbox";

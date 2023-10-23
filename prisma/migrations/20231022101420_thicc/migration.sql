/*
  Warnings:

  - A unique constraint covering the columns `[thiccGifteeId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `thiccGifteeId` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "thiccEntered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thiccGifteeId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Player_thiccGifteeId_key" ON "Player"("thiccGifteeId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_thiccGifteeId_fkey" FOREIGN KEY ("thiccGifteeId") REFERENCES "Player"("playerId") ON DELETE RESTRICT ON UPDATE CASCADE;

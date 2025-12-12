-- AlterTable
ALTER TABLE "Greenbox" ALTER COLUMN "data" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Raffle" (
    "gameday" INTEGER NOT NULL,
    "firstPrize" INTEGER NOT NULL,
    "secondPrize" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("gameday")
);

-- CreateTable
CREATE TABLE "RaffleWins" (
    "gameday" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "place" INTEGER NOT NULL,
    "tickets" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RaffleWins_gameday_playerId_key" ON "RaffleWins"("gameday", "playerId");

-- AddForeignKey
ALTER TABLE "RaffleWins" ADD CONSTRAINT "RaffleWins_gameday_fkey" FOREIGN KEY ("gameday") REFERENCES "Raffle"("gameday") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleWins" ADD CONSTRAINT "RaffleWins_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("playerId") ON DELETE RESTRICT ON UPDATE CASCADE;

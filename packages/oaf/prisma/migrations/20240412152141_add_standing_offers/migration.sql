-- CreateTable
CREATE TABLE "StandingOffer" (
    "itemId" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "StandingOffer_buyerId_itemId_key" ON "StandingOffer"("buyerId", "itemId");

-- AddForeignKey
ALTER TABLE "StandingOffer" ADD CONSTRAINT "StandingOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Player"("playerId") ON DELETE RESTRICT ON UPDATE CASCADE;

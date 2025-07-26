-- CreateTable
CREATE TABLE "FlowerPrices" (
    "id" SERIAL NOT NULL,
    "red" INTEGER NOT NULL,
    "white" INTEGER NOT NULL,
    "blue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowerPrices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowerPriceAlert" (
    "playerId" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "FlowerPriceAlert_pkey" PRIMARY KEY ("playerId")
);

-- AddForeignKey
ALTER TABLE "FlowerPriceAlert" ADD CONSTRAINT "FlowerPriceAlert_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("playerId") ON DELETE RESTRICT ON UPDATE CASCADE;

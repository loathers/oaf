-- CreateTable
CREATE TABLE "Greenbox" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Greenbox_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Greenbox" ADD CONSTRAINT "Greenbox_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("playerId") ON DELETE RESTRICT ON UPDATE CASCADE;

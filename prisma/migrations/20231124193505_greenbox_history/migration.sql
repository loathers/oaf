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

-- Migrate data
INSERT INTO "Greenbox" ("playerId", "data", "time")
SELECT "playerId", "greenboxString" as "data", "greenboxLastUpdate" as "time"
FROM "Player"
WHERE "greenboxString" IS NOT NULL AND "greenboxLastUpdate" IS NOT NULL;

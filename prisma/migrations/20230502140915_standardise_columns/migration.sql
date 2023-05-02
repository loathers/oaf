/*
  Warnings:

  - The primary key for the `Raid` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- Migrate raid_ids from string to integer
ALTER TABLE "Raid" ADD COLUMN "id" INTEGER;
UPDATE "Raid" SET "id" = CAST("raid_id" as INTEGER);

-- AlterTable
ALTER TABLE "Raid" DROP CONSTRAINT "Raid_pkey",
DROP COLUMN "raid_id",
ALTER COLUMN "id" SET NOT NULL,
ADD CONSTRAINT "Raid_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Reminder" ALTER COLUMN "guild_id" SET DATA TYPE TEXT,
ALTER COLUMN "channel_id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "message_contents" SET DATA TYPE TEXT,
ALTER COLUMN "interaction_reply_id" SET DATA TYPE TEXT;

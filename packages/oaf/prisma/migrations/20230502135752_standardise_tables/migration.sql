/*
    Standardise table names
*/

-- AlterTable
ALTER TABLE "players" RENAME TO "Player";

-- AlterTable
ALTER TABLE "reminders" RENAME TO "Reminder";

-- AlterTable
ALTER TABLE "tracked_instances" RENAME TO "Raid";

-- AlterTable
ALTER TABLE "Player" RENAME CONSTRAINT "players_pkey" TO "Player_pkey";

-- AlterTable
ALTER TABLE "Raid" RENAME CONSTRAINT "tracked_instances_pkey" TO "Raid_pkey";

-- AlterTable
ALTER TABLE "Reminder" RENAME CONSTRAINT "reminders_pkey" TO "Reminder_pkey";

-- RenameIndex
ALTER INDEX "players_username_key" RENAME TO "Player_username_key";

/*
  Use integers for raid ids
*/
-- Migrate raid_ids from string to integer
ALTER TABLE "Raid" ADD COLUMN "id" INTEGER;
UPDATE "Raid" SET "id" = CAST("raid_id" as INTEGER);

/*
  Standardise column data types
*/
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

/*
  Standardise column names
*/

-- AlterTable
ALTER TABLE "Player" RENAME COLUMN "discord_id" to "discordId";
ALTER TABLE "Player" RENAME COLUMN "done_with_skills" to "doneWithSkills";

-- AlterTable
ALTER TABLE "Reminder" RENAME COLUMN "channel_id" to "channelId";
ALTER TABLE "Reminder" RENAME COLUMN "guild_id" to "guildId";
ALTER TABLE "Reminder" RENAME COLUMN "interaction_reply_id" to "interactionReplyId";
ALTER TABLE "Reminder" RENAME COLUMN "message_contents" to "messageContents";
ALTER TABLE "Reminder" RENAME COLUMN "reminder_time" to "reminderTime";
ALTER TABLE "Reminder" RENAME COLUMN "user_id" to "userId";

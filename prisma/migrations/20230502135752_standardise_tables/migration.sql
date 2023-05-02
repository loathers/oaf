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

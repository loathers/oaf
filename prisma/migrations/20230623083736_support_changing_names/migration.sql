-- DropConstraint
ALTER TABLE "Player" DROP CONSTRAINT "Player_username_key";

-- DropIndex
DROP INDEX "Player_username_key";

-- AlterTable
ALTER TABLE "Player" RENAME COLUMN "username" TO "playerName";

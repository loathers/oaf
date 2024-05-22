/*
  Warnings:

  - You are about to drop the column `reminderTime` on the `Reminder` table. All the data in the column will be lost.
  - Added the required column `reminderDate` to the `Reminder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "reminderTime",
ADD COLUMN     "reminderDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- Change Settings table name
ALTER TABLE "Settings" RENAME CONSTRAINT "Settings_pkey" TO "Setting_pkey";
ALTER TABLE "Settings" RENAME TO "Setting";

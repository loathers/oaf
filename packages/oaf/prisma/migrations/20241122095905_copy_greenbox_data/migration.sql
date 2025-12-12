/*
  Warnings:

  - Added the required column `oldData` to the `Greenbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Greenbox" ADD COLUMN     "oldData" TEXT;
UPDATE "Greenbox" SET "oldData" = "data";
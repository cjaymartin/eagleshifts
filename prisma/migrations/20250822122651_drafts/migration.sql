/*
  Warnings:

  - The `startTime` column on the `shift_draft` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endTime` column on the `shift_draft` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "shift_draft" DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3),
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "aiDailyLimit" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false;

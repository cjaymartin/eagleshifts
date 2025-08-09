-- AlterTable
ALTER TABLE "member" ALTER COLUMN "isActivated" SET DEFAULT false;

-- AlterTable
ALTER TABLE "shift" ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

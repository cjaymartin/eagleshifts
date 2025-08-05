/*
  Warnings:

  - You are about to drop the column `location` on the `shift` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "shift" DROP COLUMN "location",
ADD COLUMN     "legacyLocation" TEXT,
ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "location_group" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "groupId" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_group_organizationId_name_key" ON "location_group"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "location_organizationId_name_key" ON "location"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_group" ADD CONSTRAINT "location_group_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "location_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

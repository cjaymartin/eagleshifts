/*
  Warnings:

  - A unique constraint covering the columns `[workosOrganizationId]` on the table `organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "workosOrganizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organization_workosOrganizationId_key" ON "organization"("workosOrganizationId");

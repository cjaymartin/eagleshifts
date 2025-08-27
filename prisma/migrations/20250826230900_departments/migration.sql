-- AlterTable
ALTER TABLE "location" ADD COLUMN     "defaultDepartmentId" TEXT;

-- AlterTable
ALTER TABLE "shift" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "shift_draft" ADD COLUMN     "departmentId" TEXT;

-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_organizationId_name_key" ON "department"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_draft" ADD CONSTRAINT "shift_draft_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_defaultDepartmentId_fkey" FOREIGN KEY ("defaultDepartmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

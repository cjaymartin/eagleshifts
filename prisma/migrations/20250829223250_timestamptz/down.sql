-- Revert AlterTable for shift_draft
ALTER TABLE "shift_draft"
ALTER COLUMN "startTime" TYPE TIMESTAMP USING "startTime" AT TIME ZONE 'UTC',
ALTER COLUMN "endTime" TYPE TIMESTAMP USING "endTime" AT TIME ZONE 'UTC';

-- Revert AlterTable for shift
ALTER TABLE "shift"
ALTER COLUMN "startTime" TYPE TIMESTAMP USING "startTime" AT TIME ZONE 'UTC',
ALTER COLUMN "endTime" TYPE TIMESTAMP USING "endTime" AT TIME ZONE 'UTC';

-- Revert AlterTable for availability
ALTER TABLE "availability" 
ALTER COLUMN "startDate" TYPE TIMESTAMP USING "startDate" AT TIME ZONE 'UTC',
ALTER COLUMN "endDate" TYPE TIMESTAMP USING "endDate" AT TIME ZONE 'UTC';
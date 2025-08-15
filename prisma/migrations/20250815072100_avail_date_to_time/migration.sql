-- 1. Add the new columns `startTime` and `endTime`
ALTER TABLE availability
    ADD COLUMN "startTime" TIMESTAMP(3),
    ADD COLUMN "endTime" TIMESTAMP(3),
    ADD COLUMN "timezone" VARCHAR(255);

-- 2. Copy data from the old `startDate` and `endDate` columns to the new columns
UPDATE availability
SET "startTime" = "startDate",
    "endTime" = "endDate";

ALTER TABLE availability ALTER COLUMN "startTime" SET NOT NULL,
                           ALTER COLUMN "endTime" SET NOT NULL;

-- TODO drop startDate and endDate later.
-- 3. (Optional) If you want to drop the old columns, once migration is verified
-- ALTER TABLE availability
--    DROP COLUMN "startDate",
--    DROP COLUMN "endDate";
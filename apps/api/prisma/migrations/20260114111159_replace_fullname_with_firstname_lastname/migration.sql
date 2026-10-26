-- AlterTable: Replace name with firstName and lastName in users table
ALTER TABLE "users" RENAME COLUMN "name" TO "first_name";

-- AddColumn: Add lastName column
ALTER TABLE "users" ADD COLUMN "last_name" VARCHAR(255);

-- MigrateData: Split existing fullName into firstName and lastName (if needed)
-- This is optional and can be run manually if you have existing data
-- UPDATE "users" 
-- SET 
--   "first_name" = SPLIT_PART("first_name", ' ', 1),
--   "last_name" = SUBSTRING("first_name" FROM POSITION(' ' IN "first_name") + 1)
-- WHERE "first_name" IS NOT NULL AND POSITION(' ' IN "first_name") > 0;

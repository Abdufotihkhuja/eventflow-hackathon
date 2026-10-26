-- Drop the X (Twitter) URL column from User and Speaker profiles.
-- Twitter is being removed from the platform; existing values are
-- discarded with the column.

ALTER TABLE "users" DROP COLUMN IF EXISTS "x_url";
ALTER TABLE "speakers" DROP COLUMN IF EXISTS "x_url";

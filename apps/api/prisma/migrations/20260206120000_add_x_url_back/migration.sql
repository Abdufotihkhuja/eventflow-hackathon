-- Add X (Twitter) back for users and speakers
ALTER TABLE "users" ADD COLUMN "x_url" TEXT;
ALTER TABLE "speakers" ADD COLUMN "x_url" TEXT;

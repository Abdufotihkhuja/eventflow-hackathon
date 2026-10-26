-- AlterTable
ALTER TABLE "users" ADD COLUMN "linkedin_url" TEXT,
ADD COLUMN "twitter_url" TEXT,
ADD COLUMN "x_url" TEXT,
ADD COLUMN "website_url" TEXT;

-- AlterTable
ALTER TABLE "speakers" ADD COLUMN "x_url" TEXT;

-- CreateEnum
CREATE TYPE "RentalType" AS ENUM ('HOURLY', 'DAILY');

-- AlterTable: add new pricing columns to rental_places
ALTER TABLE "rental_places" ADD COLUMN "price_per_hour" DECIMAL(10,2);
ALTER TABLE "rental_places" ADD COLUMN "price_per_day" DECIMAL(10,2);
ALTER TABLE "rental_places" ADD COLUMN "hourly_conditions" TEXT;
ALTER TABLE "rental_places" ADD COLUMN "daily_conditions" TEXT;

-- Migrate existing price data to price_per_day
UPDATE "rental_places" SET "price_per_day" = "price";

-- Drop old price column
ALTER TABLE "rental_places" DROP COLUMN "price";

-- AlterTable: add rental_type to contact_requests
ALTER TABLE "contact_requests" ADD COLUMN "rental_type" "RentalType";

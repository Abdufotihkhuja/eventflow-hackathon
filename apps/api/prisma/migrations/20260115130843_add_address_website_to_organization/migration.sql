-- AlterTable: Add address and website fields to organizations table
ALTER TABLE "organizations" ADD COLUMN "address" VARCHAR(500);
ALTER TABLE "organizations" ADD COLUMN "website" VARCHAR(500);

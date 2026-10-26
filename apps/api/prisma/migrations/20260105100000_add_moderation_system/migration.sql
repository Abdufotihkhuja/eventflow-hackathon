-- CreateEnum
CREATE TYPE "OrganizationVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'PENDING_REVIEW';

-- AlterTable: Add verification fields to organizations
ALTER TABLE "organizations" ADD COLUMN "verification_status" "OrganizationVerificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "organizations" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "organizations" ADD COLUMN "verified_at" TIMESTAMP(3);

-- AlterTable: Add rejection_reason to events
ALTER TABLE "events" ADD COLUMN "rejection_reason" TEXT;

-- CreateIndex
CREATE INDEX "organizations_verification_status_idx" ON "organizations"("verification_status");


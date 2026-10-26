-- AlterTable: Add isOnboardingCompleted field to users table
ALTER TABLE "users" ADD COLUMN "is_onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add isOnboardingCompleted field to organizations table
ALTER TABLE "organizations" ADD COLUMN "is_onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add isOnboardingCompleted field to organization_members table
ALTER TABLE "organization_members" ADD COLUMN "is_onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- Set existing users/organizations/members as completed (они уже используют систему)
UPDATE "users" SET "is_onboarding_completed" = true WHERE "created_at" < NOW();
UPDATE "organizations" SET "is_onboarding_completed" = true WHERE "created_at" < NOW();
UPDATE "organization_members" SET "is_onboarding_completed" = true WHERE "created_at" < NOW();

-- AlterTable: archive metadata for users (deletedAt remains the archive marker)
ALTER TABLE "users"
  ADD COLUMN "archived_by_id" UUID,
  ADD COLUMN "archive_reason" TEXT;

-- AlterTable: archive metadata for organizations
ALTER TABLE "organizations"
  ADD COLUMN "archived_by_id" UUID,
  ADD COLUMN "archive_reason" TEXT;

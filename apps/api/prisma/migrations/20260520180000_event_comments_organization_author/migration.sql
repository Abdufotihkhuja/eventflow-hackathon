-- DropForeignKey
ALTER TABLE "event_comments" DROP CONSTRAINT IF EXISTS "event_comments_user_id_fkey";

-- AlterTable: make user_id nullable, add author_organization_id
ALTER TABLE "event_comments"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN "author_organization_id" UUID;

-- Re-create User FK with nullable target
ALTER TABLE "event_comments"
  ADD CONSTRAINT "event_comments_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- New Organization FK
ALTER TABLE "event_comments"
  ADD CONSTRAINT "event_comments_author_organization_id_fkey"
    FOREIGN KEY ("author_organization_id")
    REFERENCES "organizations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Index for org lookups
CREATE INDEX "event_comments_author_organization_id_idx"
  ON "event_comments"("author_organization_id");

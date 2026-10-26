-- Add optional byline author to blog posts. References OrganizationMember
-- (org staff, not the platform-wide User account). When set, the public site
-- emits `BlogPosting.author = Person` JSON-LD for E-E-A-T; when null, the
-- legacy Organization author is used.

ALTER TABLE "blog_posts"
  ADD COLUMN "author_id" UUID;

ALTER TABLE "blog_posts"
  ADD CONSTRAINT "blog_posts_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "organization_members"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts"("author_id");

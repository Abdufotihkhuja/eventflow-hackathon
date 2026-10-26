-- Promote already approved blog posts during deploy so production data stays
-- consistent with the published moderation flow.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'blog_posts'
  ) THEN
    UPDATE "blog_posts"
    SET
      status = 'PUBLISHED',
      "published_at" = COALESCE("reviewed_at", NOW())
    WHERE status = 'APPROVED';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'BlogPost'
  ) THEN
    UPDATE "BlogPost"
    SET
      status = 'PUBLISHED',
      "published_at" = COALESCE("reviewed_at", NOW())
    WHERE status = 'APPROVED';
  END IF;
END $$;

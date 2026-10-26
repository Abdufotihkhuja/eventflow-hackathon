ALTER TABLE "organizations"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "events"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "blog_posts"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}';

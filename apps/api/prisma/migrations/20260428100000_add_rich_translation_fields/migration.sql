-- Persist per-locale rich text documents separately from plain-text translations.
ALTER TABLE "events"
  ADD COLUMN "rich_translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "rich_translation_meta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "blog_posts"
  ADD COLUMN "rich_translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "rich_translation_meta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "event_categories"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "event_collections"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}';

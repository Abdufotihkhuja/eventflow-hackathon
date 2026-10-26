ALTER TABLE "rental_places"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "rich_translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "rich_translation_meta" JSONB NOT NULL DEFAULT '{}';

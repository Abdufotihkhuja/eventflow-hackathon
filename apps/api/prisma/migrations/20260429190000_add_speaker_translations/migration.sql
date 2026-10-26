-- Add translations columns for Speaker localization
-- Fields covered: position, company, bio (scalar fields stay as legacy fallback).
-- firstName/lastName are NOT translated (proper names), URLs are NOT translated.

ALTER TABLE "speakers"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}';

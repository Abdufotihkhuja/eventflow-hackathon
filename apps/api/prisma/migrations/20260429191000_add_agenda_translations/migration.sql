-- Add translations columns for AgendaItem localization
-- Fields covered: title, description, location (scalar fields stay as legacy fallback).

ALTER TABLE "agenda_items"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "translation_meta" JSONB NOT NULL DEFAULT '{}';

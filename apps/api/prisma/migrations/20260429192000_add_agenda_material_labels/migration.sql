-- Add localized labels for agenda materials
-- Structure: { "<url>": { "ru"?: string, "uz"?: string, "en"?: string } }
-- Existing materials get an empty object; legacy display falls back to the
-- URL-derived name in the frontend.

ALTER TABLE "agenda_items"
  ADD COLUMN "material_labels" JSONB NOT NULL DEFAULT '{}';

-- AlterTable: name typography for badge templates (mirrors certificate_templates).
-- Additive & nullable: existing rows keep NULL and fall back to the previous
-- hardcoded rendering defaults, so already-saved templates are unaffected.
ALTER TABLE "badge_templates"
  ADD COLUMN "name_font" TEXT,
  ADD COLUMN "name_font_size" INTEGER,
  ADD COLUMN "name_color" TEXT;

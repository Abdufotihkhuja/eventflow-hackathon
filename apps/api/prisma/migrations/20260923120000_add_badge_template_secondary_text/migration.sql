-- AlterTable: per-template text, size and color for the role and event name
-- printed on a badge. Additive & nullable: existing rows keep NULL and fall
-- back to the previous rendering defaults (role displayName / event title,
-- fixed 8pt/7pt grey), so already-saved templates render as before.
ALTER TABLE "badge_templates"
  ADD COLUMN "role_label" TEXT,
  ADD COLUMN "role_font_size" INTEGER,
  ADD COLUMN "role_color" TEXT,
  ADD COLUMN "event_label" TEXT,
  ADD COLUMN "event_font_size" INTEGER,
  ADD COLUMN "event_color" TEXT;

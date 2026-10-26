-- Add localization JSON columns for recipient roles + badge / certificate
-- templates. Each holds { fieldKey: { ru?, uz?, en? } }: only displayName /
-- name needs translation in these entities.
-- All migrations are additive (default '{}'); legacy scalar columns
-- (display_name, name) stay populated as fallback.

ALTER TABLE "event_recipient_roles"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "badge_templates"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "certificate_templates"
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';

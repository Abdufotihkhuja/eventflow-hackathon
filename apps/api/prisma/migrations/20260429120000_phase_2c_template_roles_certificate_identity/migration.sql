ALTER TABLE "certificate_templates" ADD COLUMN "recipient_role_id" UUID;
ALTER TABLE "badge_templates" ADD COLUMN "recipient_role_id" UUID;

ALTER TABLE "certificates" ADD COLUMN "normalized_artifact_key" TEXT;
ALTER TABLE "certificates" ADD COLUMN "is_current" BOOLEAN NOT NULL DEFAULT true;

UPDATE "certificate_templates" AS ct
SET "recipient_role_id" = r."id"
FROM "event_recipient_roles" AS r
WHERE r."event_id" = ct."event_id"
  AND r."code" = lower(ct."recipient_role"::text);

UPDATE "badge_templates" AS bt
SET "recipient_role_id" = r."id"
FROM "event_recipient_roles" AS r
WHERE r."event_id" = bt."event_id"
  AND r."code" = lower(bt."recipient_role"::text);

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "event_id", "recipient_role_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id"
    ) AS rn
  FROM "certificate_templates"
  WHERE "recipient_role_id" IS NOT NULL
    AND "is_active" = true
    AND "is_default" = true
)
UPDATE "certificate_templates" AS ct
SET "is_default" = false
FROM ranked
WHERE ct."id" = ranked."id"
  AND ranked.rn > 1;

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "event_id", "recipient_role"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id"
    ) AS rn
  FROM "certificate_templates"
  WHERE "recipient_role_id" IS NULL
    AND "is_active" = true
    AND "is_default" = true
)
UPDATE "certificate_templates" AS ct
SET "is_default" = false
FROM ranked
WHERE ct."id" = ranked."id"
  AND ranked.rn > 1;

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "event_id", "recipient_role_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id"
    ) AS rn
  FROM "badge_templates"
  WHERE "recipient_role_id" IS NOT NULL
    AND "is_active" = true
    AND "is_default" = true
)
UPDATE "badge_templates" AS bt
SET "is_default" = false
FROM ranked
WHERE bt."id" = ranked."id"
  AND ranked.rn > 1;

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "event_id", "recipient_role"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id"
    ) AS rn
  FROM "badge_templates"
  WHERE "recipient_role_id" IS NULL
    AND "is_active" = true
    AND "is_default" = true
)
UPDATE "badge_templates" AS bt
SET "is_default" = false
FROM ranked
WHERE bt."id" = ranked."id"
  AND ranked.rn > 1;

DROP INDEX IF EXISTS "certificate_templates_one_active_default_per_role_idx";
DROP INDEX IF EXISTS "badge_templates_one_active_default_per_role_idx";

CREATE UNIQUE INDEX "certificate_templates_one_active_default_per_recipient_role_idx"
  ON "certificate_templates"("event_id", "recipient_role_id")
  WHERE "is_default" = true
    AND "is_active" = true
    AND "recipient_role_id" IS NOT NULL;

CREATE UNIQUE INDEX "certificate_templates_one_active_default_per_legacy_role_idx"
  ON "certificate_templates"("event_id", "recipient_role")
  WHERE "is_default" = true
    AND "is_active" = true
    AND "recipient_role_id" IS NULL;

CREATE UNIQUE INDEX "badge_templates_one_active_default_per_recipient_role_idx"
  ON "badge_templates"("event_id", "recipient_role_id")
  WHERE "is_default" = true
    AND "is_active" = true
    AND "recipient_role_id" IS NOT NULL;

CREATE UNIQUE INDEX "badge_templates_one_active_default_per_legacy_role_idx"
  ON "badge_templates"("event_id", "recipient_role")
  WHERE "is_default" = true
    AND "is_active" = true
    AND "recipient_role_id" IS NULL;

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "event_recipient_id", "recipient_role_id"
      ORDER BY "generated_at" DESC NULLS LAST, "updated_at" DESC, "created_at" DESC, "id"
    ) AS rn
  FROM "certificates"
  WHERE "event_recipient_id" IS NOT NULL
    AND "recipient_role_id" IS NOT NULL
)
UPDATE "certificates" AS c
SET "is_current" = ranked.rn = 1
FROM ranked
WHERE c."id" = ranked."id";

UPDATE "certificates"
SET "normalized_artifact_key" =
  'certificate:' ||
  "event_id"::text || ':' ||
  "event_recipient_id"::text || ':' ||
  "recipient_role_id"::text || ':' ||
  "template_id"::text || ':' ||
  "template_version_hash"
WHERE "event_recipient_id" IS NOT NULL
  AND "recipient_role_id" IS NOT NULL
  AND "template_id" IS NOT NULL
  AND "template_version_hash" IS NOT NULL;

DROP INDEX IF EXISTS "certificates_event_recipient_id_recipient_role_id_key";

CREATE UNIQUE INDEX "certificates_normalized_artifact_key_key"
  ON "certificates"("normalized_artifact_key")
  WHERE "normalized_artifact_key" IS NOT NULL;

CREATE UNIQUE INDEX "certificates_one_current_per_recipient_role_idx"
  ON "certificates"("event_recipient_id", "recipient_role_id")
  WHERE "is_current" = true
    AND "event_recipient_id" IS NOT NULL
    AND "recipient_role_id" IS NOT NULL;

CREATE INDEX "certificate_templates_event_id_recipient_role_id_idx"
  ON "certificate_templates"("event_id", "recipient_role_id");
CREATE INDEX "certificate_templates_recipient_role_id_idx"
  ON "certificate_templates"("recipient_role_id");
CREATE INDEX "badge_templates_event_id_recipient_role_id_idx"
  ON "badge_templates"("event_id", "recipient_role_id");
CREATE INDEX "badge_templates_recipient_role_id_idx"
  ON "badge_templates"("recipient_role_id");
CREATE INDEX "certificates_event_recipient_id_recipient_role_id_is_current_idx"
  ON "certificates"("event_recipient_id", "recipient_role_id", "is_current");

ALTER TABLE "certificate_templates"
  ADD CONSTRAINT "certificate_templates_recipient_role_id_fkey"
  FOREIGN KEY ("recipient_role_id") REFERENCES "event_recipient_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "badge_templates"
  ADD CONSTRAINT "badge_templates_recipient_role_id_fkey"
  FOREIGN KEY ("recipient_role_id") REFERENCES "event_recipient_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

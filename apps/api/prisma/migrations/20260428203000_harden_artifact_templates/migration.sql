ALTER TABLE "certificate_templates"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "badge_templates"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "certificates"
  ADD COLUMN "template_version_hash" TEXT;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "event_id", "recipient_role"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS rn
  FROM "certificate_templates"
  WHERE "is_default" = true AND "is_active" = true
)
UPDATE "certificate_templates"
SET "is_default" = false
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "event_id", "recipient_role"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS rn
  FROM "badge_templates"
  WHERE "is_default" = true AND "is_active" = true
)
UPDATE "badge_templates"
SET "is_default" = false
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "certificate_templates_one_active_default_per_role_idx"
  ON "certificate_templates"("event_id", "recipient_role")
  WHERE "is_default" = true AND "is_active" = true;

CREATE UNIQUE INDEX "badge_templates_one_active_default_per_role_idx"
  ON "badge_templates"("event_id", "recipient_role")
  WHERE "is_default" = true AND "is_active" = true;

CREATE INDEX "certificates_template_version_hash_idx"
  ON "certificates"("template_version_hash");

INSERT INTO "permissions" ("id", "code", "name", "description", "category")
VALUES (
  '9d1f6da0-4ac5-4d52-bf51-0df815622db0',
  'certificates:export',
  'Экспорт сертификатов',
  'Скачивание и экспорт сертификатов и бейджей',
  'certificates'
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "organization_roles"."id", "permissions"."id"
FROM "organization_roles"
CROSS JOIN "permissions"
WHERE "permissions"."code" = 'certificates:export'
  AND "organization_roles"."name" IN (
    'Владелец',
    'Администратор',
    'Менеджер событий',
    'Координатор событий'
  )
ON CONFLICT DO NOTHING;

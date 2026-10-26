ALTER TABLE "certificates" ADD COLUMN "event_id" UUID;
ALTER TABLE "certificates" ADD COLUMN "event_recipient_id" UUID;
ALTER TABLE "certificates" ADD COLUMN "recipient_role_id" UUID;

UPDATE "certificates" AS c
SET "event_id" = r."event_id"
FROM "registrations" AS r
WHERE c."registration_id" = r."id";

UPDATE "certificates" AS c
SET "event_recipient_id" = ers."recipient_id"
FROM "event_recipient_sources" AS ers
WHERE ers."source_type" = 'REGISTRATION'
  AND ers."source_id" = c."registration_id"
  AND ers."event_id" = c."event_id";

UPDATE "certificates" AS c
SET "recipient_role_id" = err."id"
FROM "certificate_templates" AS ct,
     "event_recipient_roles" AS err
WHERE c."template_id" = ct."id"
  AND err."event_id" = c."event_id"
  AND err."code" = LOWER(ct."recipient_role"::text);

UPDATE "certificates" AS c
SET "recipient_role_id" = err."id"
FROM "registrations" AS r,
     "event_recipient_roles" AS err
WHERE c."registration_id" = r."id"
  AND c."recipient_role_id" IS NULL
  AND err."event_id" = c."event_id"
  AND err."code" = LOWER(r."role"::text);

ALTER TABLE "certificates" ALTER COLUMN "event_id" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "registration_id" DROP NOT NULL;

ALTER TABLE "certificates" DROP CONSTRAINT IF EXISTS "certificates_registration_id_fkey";
ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_registration_id_fkey"
  FOREIGN KEY ("registration_id") REFERENCES "registrations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_event_recipient_id_fkey"
  FOREIGN KEY ("event_recipient_id") REFERENCES "event_recipients"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_recipient_role_id_fkey"
  FOREIGN KEY ("recipient_role_id") REFERENCES "event_recipient_roles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "certificates_event_recipient_id_recipient_role_id_key"
  ON "certificates"("event_recipient_id", "recipient_role_id");
CREATE INDEX "certificates_event_id_idx" ON "certificates"("event_id");
CREATE INDEX "certificates_event_recipient_id_idx" ON "certificates"("event_recipient_id");
CREATE INDEX "certificates_recipient_role_id_idx" ON "certificates"("recipient_role_id");

ALTER TYPE "EventAccessType" ADD VALUE IF NOT EXISTS 'PRIVATE';

ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "comments_enabled" BOOLEAN NOT NULL DEFAULT true;

DO $$
DECLARE
  has_legacy_user_type BOOLEAN;
  has_legacy_actor_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'identities'
      AND column_name = 'legacy_user_type'
  ) INTO has_legacy_user_type;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'identities'
      AND column_name = 'legacy_actor_id'
  ) INTO has_legacy_actor_id;

  IF has_legacy_user_type THEN
    ALTER TABLE "identities"
    ALTER COLUMN "legacy_user_type" DROP NOT NULL;
  END IF;

  IF has_legacy_actor_id THEN
    ALTER TABLE "identities"
    ALTER COLUMN "legacy_actor_id" DROP NOT NULL;
  END IF;

  IF has_legacy_user_type THEN
    EXECUTE '
      UPDATE "identities"
      SET "actor_type" = COALESCE("actor_type", "legacy_user_type")
      WHERE "actor_type" IS NULL
        AND "legacy_user_type" IS NOT NULL
    ';
  END IF;

  IF has_legacy_actor_id THEN
    EXECUTE '
      UPDATE "identities"
      SET "actor_id" = COALESCE("actor_id", "legacy_actor_id")
      WHERE "actor_id" IS NULL
        AND "legacy_actor_id" IS NOT NULL
    ';
  END IF;
END $$;

ALTER TABLE "identities"
ALTER COLUMN "actor_type" SET NOT NULL;

ALTER TABLE "identities"
ALTER COLUMN "actor_id" SET NOT NULL;

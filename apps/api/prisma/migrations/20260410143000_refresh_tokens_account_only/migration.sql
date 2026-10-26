UPDATE "refresh_tokens" AS rt
SET "account_id" = i."account_id"
FROM "identities" AS i
WHERE rt."account_id" IS NULL
  AND i."actor_type" = rt."user_type"
  AND (
    (rt."user_type" = 'USER' AND i."actor_id" = rt."user_id")
    OR (rt."user_type" = 'ORGANIZATION' AND i."actor_id" = rt."organization_id")
    OR (rt."user_type" = 'MEMBER' AND i."actor_id" = rt."member_id")
    OR (rt."user_type" = 'SUPER_ADMIN' AND i."actor_id" = rt."super_admin_id")
  );

DELETE FROM "refresh_tokens"
WHERE "account_id" IS NULL;

ALTER TABLE "refresh_tokens"
ALTER COLUMN "account_id" SET NOT NULL;

DROP INDEX IF EXISTS "refresh_tokens_user_id_idx";
DROP INDEX IF EXISTS "refresh_tokens_organization_id_idx";
DROP INDEX IF EXISTS "refresh_tokens_member_id_idx";
DROP INDEX IF EXISTS "refresh_tokens_super_admin_id_idx";

ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_organization_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_member_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_super_admin_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_account_id_fkey";

ALTER TABLE "refresh_tokens"
DROP COLUMN IF EXISTS "user_id",
DROP COLUMN IF EXISTS "organization_id",
DROP COLUMN IF EXISTS "member_id",
DROP COLUMN IF EXISTS "super_admin_id";

ALTER TABLE "refresh_tokens"
ADD CONSTRAINT "refresh_tokens_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

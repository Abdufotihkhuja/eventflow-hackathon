-- Replace Twitter/X with Instagram and Facebook (users)
ALTER TABLE "users" DROP COLUMN IF EXISTS "twitter_url";
ALTER TABLE "users" DROP COLUMN IF EXISTS "x_url";
ALTER TABLE "users" ADD COLUMN "instagram_url" TEXT;
ALTER TABLE "users" ADD COLUMN "facebook_url" TEXT;

-- Replace Twitter/X with Instagram and Facebook (speakers)
ALTER TABLE "speakers" DROP COLUMN IF EXISTS "twitter_url";
ALTER TABLE "speakers" DROP COLUMN IF EXISTS "x_url";
ALTER TABLE "speakers" ADD COLUMN "instagram_url" TEXT;
ALTER TABLE "speakers" ADD COLUMN "facebook_url" TEXT;

CREATE TYPE "PlatformElevationMode" AS ENUM ('READ', 'WRITE');

CREATE TABLE "platform_elevations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "requested_by_admin_id" UUID NOT NULL,
  "approved_by_admin_id" UUID,
  "organization_id" UUID,
  "mode" "PlatformElevationMode" NOT NULL DEFAULT 'READ',
  "token_hash" TEXT,
  "reason" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" TIMESTAMP(3),
  CONSTRAINT "platform_elevations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_elevations_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "platform_elevations_token_hash_key"
  ON "platform_elevations"("token_hash");
CREATE INDEX "platform_elevations_account_id_expires_at_idx"
  ON "platform_elevations"("account_id", "expires_at");
CREATE INDEX "platform_elevations_organization_id_idx"
  ON "platform_elevations"("organization_id");

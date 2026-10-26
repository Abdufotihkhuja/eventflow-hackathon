-- Refresh rows become immutable family members. Consumed tokens are retained
-- so reuse can revoke the whole family instead of looking like an unknown token.
ALTER TABLE "refresh_tokens"
  ADD COLUMN "family_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "consumed_at" TIMESTAMP(3),
  ADD COLUMN "revoked_at" TIMESTAMP(3),
  ADD COLUMN "replaced_by_token_hash" TEXT;

CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

CREATE TABLE "mobile_oauth_exchanges" (
    "id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mobile_oauth_exchanges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_oauth_exchanges_code_hash_key"
ON "mobile_oauth_exchanges"("code_hash");

CREATE INDEX "mobile_oauth_exchanges_expires_at_idx"
ON "mobile_oauth_exchanges"("expires_at");

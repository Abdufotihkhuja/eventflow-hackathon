ALTER TABLE "email_verification_codes"
RENAME COLUMN "userType" TO "actor_type";

ALTER TABLE "email_verification_codes"
RENAME COLUMN "userId" TO "actor_id";

DROP INDEX IF EXISTS "email_verification_codes_userId_idx";
CREATE INDEX "email_verification_codes_actor_id_idx" ON "email_verification_codes"("actor_id");

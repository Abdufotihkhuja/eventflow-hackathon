-- CreateEnum
CREATE TYPE "VerificationCodeType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE');

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "VerificationCodeType" NOT NULL,
    "userType" "UserType" NOT NULL,
    "userId" UUID,
    "newEmail" TEXT,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_verification_codes_email_type_is_used_idx" ON "email_verification_codes"("email", "type", "is_used");

-- CreateIndex
CREATE INDEX "email_verification_codes_code_expires_at_idx" ON "email_verification_codes"("code", "expires_at");

-- CreateIndex
CREATE INDEX "email_verification_codes_userId_idx" ON "email_verification_codes"("userId");

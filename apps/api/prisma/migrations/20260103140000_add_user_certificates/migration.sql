-- CreateTable: UserCertificate - сертификаты профиля пользователя
CREATE TABLE "user_certificates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "training_hours" INTEGER NOT NULL DEFAULT 0,
    "credential_id" TEXT,
    "credential_url" TEXT,
    "certificate_url" TEXT,
    "skills" TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_certificates_user_id_idx" ON "user_certificates"("user_id");

-- CreateIndex
CREATE INDEX "user_certificates_is_verified_idx" ON "user_certificates"("is_verified");

-- AddForeignKey
ALTER TABLE "user_certificates" ADD CONSTRAINT "user_certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


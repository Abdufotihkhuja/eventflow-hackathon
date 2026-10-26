-- CreateTable: certificate_templates
CREATE TABLE "certificate_templates" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "template_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "name_position" JSONB NOT NULL,
    "name_font" TEXT,
    "name_font_size" INTEGER,
    "name_color" TEXT,
    "date_position" JSONB,
    "event_name_position" JSONB,
    "first_name_position" JSONB,
    "last_name_position" JSONB,
    "qr_position" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_templates_event_id_idx" ON "certificate_templates"("event_id");

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: certificates - add new columns
ALTER TABLE "certificates" ADD COLUMN "template_id" UUID,
ADD COLUMN "recipient_name" TEXT,
ADD COLUMN "recipient_email" TEXT,
ADD COLUMN "event_name" TEXT,
ADD COLUMN "event_date" DATE,
ADD COLUMN "verification_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verification_code_key" ON "certificates"("verification_code");
CREATE INDEX "certificates_template_id_idx" ON "certificates"("template_id");
CREATE INDEX "certificates_verification_code_idx" ON "certificates"("verification_code");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

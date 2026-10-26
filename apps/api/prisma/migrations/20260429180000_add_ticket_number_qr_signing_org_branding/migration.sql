-- Default e-ticket per registered user + organization branding
-- See plan: ticketNumber (EVF-YYMMDD-XXXXXX), QR payload signing version, brand colors.

ALTER TABLE "registrations" ADD COLUMN "ticket_number" TEXT;
ALTER TABLE "registrations" ADD COLUMN "ticket_issued_at" TIMESTAMP(3);
ALTER TABLE "registrations" ADD COLUMN "qr_payload_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "registrations" ADD COLUMN "qr_secret_rotated_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "registrations_ticket_number_key" ON "registrations"("ticket_number");

ALTER TABLE "organizations" ADD COLUMN "brand_color" TEXT;
ALTER TABLE "organizations" ADD COLUMN "accent_color" TEXT;

CREATE TYPE "AssetGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TYPE "TicketArtifactDesign" AS ENUM ('BRANDED', 'SIMPLE');

ALTER TABLE "certificates"
ADD COLUMN "generation_status" "AssetGenerationStatus",
ADD COLUMN "generation_error" TEXT;

CREATE TABLE "ticket_artifacts" (
  "id" UUID NOT NULL,
  "registration_id" UUID NOT NULL,
  "design" "TicketArtifactDesign" NOT NULL,
  "ticket_url" TEXT,
  "generation_status" "AssetGenerationStatus",
  "generation_error" TEXT,
  "generated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ticket_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ticket_artifacts_registration_id_design_key"
ON "ticket_artifacts"("registration_id", "design");

CREATE INDEX "certificates_generation_status_idx"
ON "certificates"("generation_status");

CREATE INDEX "ticket_artifacts_generation_status_idx"
ON "ticket_artifacts"("generation_status");

ALTER TABLE "ticket_artifacts"
ADD CONSTRAINT "ticket_artifacts_registration_id_fkey"
FOREIGN KEY ("registration_id") REFERENCES "registrations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

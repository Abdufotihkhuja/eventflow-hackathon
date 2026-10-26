ALTER TABLE "certificate_templates"
  ADD COLUMN "recipient_role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
  ADD COLUMN "size_preset" TEXT NOT NULL DEFAULT 'A4_LANDSCAPE',
  ADD COLUMN "width_px" INTEGER NOT NULL DEFAULT 3508,
  ADD COLUMN "height_px" INTEGER NOT NULL DEFAULT 2480;

CREATE INDEX "certificate_templates_event_id_recipient_role_idx"
  ON "certificate_templates"("event_id", "recipient_role");

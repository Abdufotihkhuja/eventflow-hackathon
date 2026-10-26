-- CreateTable
CREATE TABLE "badge_templates" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "recipient_role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "size_preset" TEXT NOT NULL DEFAULT 'BADGE_85X55',
    "width_px" INTEGER NOT NULL DEFAULT 1004,
    "height_px" INTEGER NOT NULL DEFAULT 650,
    "template_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "name_position" JSONB,
    "first_name_position" JSONB,
    "last_name_position" JSONB,
    "role_position" JSONB,
    "event_name_position" JSONB,
    "qr_position" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badge_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "badge_templates_event_id_idx" ON "badge_templates"("event_id");

-- CreateIndex
CREATE INDEX "badge_templates_event_id_recipient_role_idx" ON "badge_templates"("event_id", "recipient_role");

-- AddForeignKey
ALTER TABLE "badge_templates" ADD CONSTRAINT "badge_templates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

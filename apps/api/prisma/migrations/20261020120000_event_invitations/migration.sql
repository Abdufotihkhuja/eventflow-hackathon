-- CreateTable: personal invitations to PRIVATE events. Additive only: a new
-- table, existing events and registrations are untouched.
CREATE TABLE "event_invitations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "token_hash" TEXT NOT NULL,
    "last_sent_at" TIMESTAMP(3) NOT NULL,
    "send_count" INTEGER NOT NULL DEFAULT 1,
    "invited_by_user_id" UUID,
    "accepted_at" TIMESTAMP(3),
    "accepted_by_user_id" UUID,
    "registration_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_invitations_token_hash_key" ON "event_invitations"("token_hash");
CREATE UNIQUE INDEX "event_invitations_event_id_email_key" ON "event_invitations"("event_id", "email");

ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

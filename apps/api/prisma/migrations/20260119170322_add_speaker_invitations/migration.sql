-- CreateEnum: SpeakerInvitationStatus
CREATE TYPE "SpeakerInvitationStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable: speakers - добавить новые поля для системы приглашений
ALTER TABLE "speakers" 
  ADD COLUMN "user_id" UUID,
  ADD COLUMN "invitation_status" "SpeakerInvitationStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "invitation_token" TEXT,
  ADD COLUMN "token_expires_at" TIMESTAMP(3),
  ADD COLUMN "invited_email" TEXT;

-- AddForeignKey: speakers -> users
ALTER TABLE "speakers" 
  ADD CONSTRAINT "speakers_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: speakers_user_id_idx
CREATE INDEX "speakers_user_id_idx" ON "speakers"("user_id");

-- CreateIndex: speakers_invitation_token_key (unique)
CREATE UNIQUE INDEX "speakers_invitation_token_key" ON "speakers"("invitation_token");

-- CreateIndex: speakers_invitation_status_idx
CREATE INDEX "speakers_invitation_status_idx" ON "speakers"("invitation_status");

-- CreateIndex: speakers_invited_email_idx
CREATE INDEX "speakers_invited_email_idx" ON "speakers"("invited_email");

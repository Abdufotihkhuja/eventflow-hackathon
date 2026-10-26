-- Registration "file upload" question type.
-- Additive & reversible-in-intent: extends an enum, adds one nullable JSON
-- column, and creates one new table. No existing rows are modified, so all
-- current question types and answers keep working unchanged.

-- AlterEnum: new question type
ALTER TYPE "QuestionType" ADD VALUE 'FILE_UPLOAD';

-- CreateEnum: lifecycle status of a participant-uploaded file
CREATE TYPE "RegistrationFileStatus" AS ENUM ('PENDING', 'ATTACHED');

-- AlterTable: per-question file-upload settings (null for every other type)
ALTER TABLE "registration_questions" ADD COLUMN "file_upload_config" JSONB;

-- CreateTable: participant-uploaded answer files (stored privately)
CREATE TABLE "registration_file_uploads" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "registration_id" UUID,
    "organization_id" UUID NOT NULL,
    "uploaded_by_id" UUID,
    "original_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "RegistrationFileStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_file_uploads_event_id_idx" ON "registration_file_uploads"("event_id");
CREATE INDEX "registration_file_uploads_question_id_idx" ON "registration_file_uploads"("question_id");
CREATE INDEX "registration_file_uploads_registration_id_idx" ON "registration_file_uploads"("registration_id");
CREATE INDEX "registration_file_uploads_uploaded_by_id_idx" ON "registration_file_uploads"("uploaded_by_id");

-- AddForeignKey
ALTER TABLE "registration_file_uploads" ADD CONSTRAINT "registration_file_uploads_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_file_uploads" ADD CONSTRAINT "registration_file_uploads_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "registration_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_file_uploads" ADD CONSTRAINT "registration_file_uploads_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "registrations_event_id_status_idx" ON "registrations"("event_id", "status");

-- CreateIndex
CREATE INDEX "registration_file_uploads_organization_id_idx" ON "registration_file_uploads"("organization_id");

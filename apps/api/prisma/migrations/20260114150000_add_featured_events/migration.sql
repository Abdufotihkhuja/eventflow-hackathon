-- AlterTable
ALTER TABLE "events" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "events_is_featured_start_date_idx" ON "events"("is_featured", "start_date");

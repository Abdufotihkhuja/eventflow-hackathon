-- AlterTable: public view counter for events (incremented on public by-slug reads)
ALTER TABLE "events" ADD COLUMN "views_count" INTEGER NOT NULL DEFAULT 0;

-- Move event categories from a single `events.category_id` FK to a many-to-many
-- relation (`_EventCategories` join table). Existing single-category assignments
-- are backfilled into the join table before the column is dropped, so no data is lost.

-- CreateTable
CREATE TABLE "_EventCategories" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_EventCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventCategories_B_index" ON "_EventCategories"("B");

-- AddForeignKey
ALTER TABLE "_EventCategories" ADD CONSTRAINT "_EventCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventCategories" ADD CONSTRAINT "_EventCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single-category assignments into the join table
INSERT INTO "_EventCategories" ("A", "B")
SELECT "id", "category_id"
FROM "events"
WHERE "category_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_category_id_fkey";

-- DropIndex
DROP INDEX "events_category_id_idx";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "category_id";

-- AlterTable: agenda_items - добавить поле date для многодневных мероприятий
-- Сначала добавляем колонку как nullable
ALTER TABLE "agenda_items" ADD COLUMN "date" DATE;

-- Заполняем существующие записи датой начала события
UPDATE "agenda_items" ai
SET "date" = (
    SELECT DATE(e."start_date")
    FROM "events" e
    WHERE e."id" = ai."event_id"
);

-- Делаем колонку NOT NULL
ALTER TABLE "agenda_items" ALTER COLUMN "date" SET NOT NULL;

-- CreateIndex
CREATE INDEX "agenda_items_date_idx" ON "agenda_items"("date");

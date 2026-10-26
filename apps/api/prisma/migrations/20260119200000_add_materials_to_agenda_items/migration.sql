-- AlterTable: agenda_items
-- Добавляем поле materials для хранения ссылок на материалы (презентации, документы)
ALTER TABLE "agenda_items" ADD COLUMN "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: speakers - заменить name на first_name и last_name
ALTER TABLE "speakers"
  ADD COLUMN "first_name" TEXT,
  ADD COLUMN "last_name" TEXT;

-- Перенос данных: всё текущее имя в first_name, last_name пустая строка
UPDATE "speakers" SET "first_name" = "name", "last_name" = '' WHERE "name" IS NOT NULL;
UPDATE "speakers" SET "first_name" = '', "last_name" = '' WHERE "name" IS NULL;

-- Сделать поля обязательными и удалить name
ALTER TABLE "speakers"
  ALTER COLUMN "first_name" SET NOT NULL,
  ALTER COLUMN "last_name" SET NOT NULL,
  DROP COLUMN "name";

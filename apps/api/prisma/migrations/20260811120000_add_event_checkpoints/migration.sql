-- Промежуточные чекпоинты события.
--
-- Организатор задаёт именованные окна времени («Регистрация», «Обед», «День 2»),
-- внутри одного окна участника нельзя отметить дважды. Окна одного события не
-- пересекаются (валидация в EventCheckpointsService), поэтому в любой момент
-- активен максимум один чекпоинт.
--
-- Уникальность отметки перестаёт быть «одна на день» и становится составной:
--   * без чекпоинта (scan вне всех окон) — прежнее правило «один на UTC-день»;
--   * с чекпоинтом — один на чекпоинт.
-- Prisma частичные unique-индексы не описывает → raw SQL, а дедуп в сервисах
-- делается через findFirst + перехват P2002.
--
-- Аддитивно и обратимо: чтобы откатить, восстановите
--   CREATE UNIQUE INDEX "attendances_registration_id_check_in_date_key"
--     ON "attendances"("registration_id", "check_in_date");
-- (предварительно удалив строки с непустым checkpoint_id) и удалите таблицу.

-- CreateTable: event_checkpoints
CREATE TABLE "event_checkpoints" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_checkpoints_event_id_starts_at_idx" ON "event_checkpoints"("event_id", "starts_at");

-- AddForeignKey
ALTER TABLE "event_checkpoints" ADD CONSTRAINT "event_checkpoints_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: attendances.checkpoint_id
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "checkpoint_id" UUID;

-- AddForeignKey: удаление чекпоинта уносит его отметки (организатор подтверждает
-- количество в UI перед удалением).
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_checkpoint_id_fkey"
  FOREIGN KEY ("checkpoint_id") REFERENCES "event_checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attendances_checkpoint_id_idx" ON "attendances"("checkpoint_id");

-- DropIndex: безусловная «одна отметка на день» больше не верна — на одном дне
-- может быть несколько чекпоинтов.
DROP INDEX IF EXISTS "attendances_registration_id_check_in_date_key";

-- CreateIndex: частичные unique-замки (Prisma их не выражает).
CREATE UNIQUE INDEX IF NOT EXISTS "attendances_registration_day_partial_key"
  ON "attendances"("registration_id", "check_in_date")
  WHERE "checkpoint_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "attendances_registration_checkpoint_partial_key"
  ON "attendances"("registration_id", "checkpoint_id")
  WHERE "checkpoint_id" IS NOT NULL;

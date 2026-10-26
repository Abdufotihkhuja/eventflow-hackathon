-- Отметка «событие когда-то было опубликовано». Нужна, чтобы прошедшее
-- событие можно было завершить даже после возврата в черновик: статус
-- PUBLISHED теряется при ре-модерации, а факт публикации — нет.

ALTER TABLE "events" ADD COLUMN "published_at" TIMESTAMP(3);

-- Бэкфилл для тех, кто сейчас в эфире или уже завершён: точного момента
-- публикации в истории нет, updated_at — ближайшая честная оценка.
UPDATE "events"
SET "published_at" = "updated_at"
WHERE "status" IN ('PUBLISHED', 'COMPLETED')
  AND "published_at" IS NULL;

-- Застрявшие черновики и события на повторной модерации: регистрация возможна
-- только на опубликованное событие, поэтому наличие регистраций — доказательство
-- публикации в прошлом. Момент неизвестен, берём created_at как нижнюю границу.
UPDATE "events"
SET "published_at" = "created_at"
WHERE "status" IN ('DRAFT', 'PENDING_REVIEW')
  AND "published_at" IS NULL
  AND EXISTS (
    SELECT 1 FROM "registrations" WHERE "registrations"."event_id" = "events"."id"
  );

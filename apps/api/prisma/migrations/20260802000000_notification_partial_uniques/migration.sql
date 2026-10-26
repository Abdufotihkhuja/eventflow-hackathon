-- Партиальные unique-замки идемпотентности доставок (DATA_MODEL_DELTA §8, п.5).
-- Postgres считает NULL различными, поэтому composite unique
-- (dedup_key, account_id, channel) НЕ ограничивает строки с account_id IS NULL.
-- Prisma партиальные индексы не описывает — raw SQL (аддитивно).

-- Org-адресованные in-app строки (организаторская лента, account_id IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_dedup_org_channel_partial_key"
  ON "notification_deliveries"("dedup_key", "organization_id", "channel")
  WHERE "account_id" IS NULL AND "organization_id" IS NOT NULL;

-- Безадресные строки (модераторские email на общий ящик, MOD-02/03/06).
CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_dedup_channel_partial_key"
  ON "notification_deliveries"("dedup_key", "channel")
  WHERE "account_id" IS NULL AND "organization_id" IS NULL;

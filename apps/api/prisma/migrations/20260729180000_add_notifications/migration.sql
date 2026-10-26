-- Центр уведомлений организации (2.6).
--
-- Хранится ТИП и структурированный payload, а не готовая фраза: ленту читают на
-- трёх языках, и предформатированная строка в БД — ровно та ошибка, из-за
-- которой мобильный клиент выбрасывает `description` ленты активности и
-- пересобирает текст заново.

CREATE TYPE "NotificationType" AS ENUM (
  'REGISTRATION_CREATED',
  'REGISTRATION_APPROVED',
  'REGISTRATION_REJECTED',
  'EVENT_PUBLISHED',
  'EVENT_REJECTED',
  'MEMBER_JOINED',
  'ORG_VERIFIED',
  'ORG_VERIFICATION_REJECTED'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  -- null = уведомление всей организации, его видит любой сотрудник
  "member_id" UUID,
  "type" "NotificationType" NOT NULL,
  "entity_type" TEXT,
  "entity_id" UUID,
  "payload" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Лента: свежие сверху в пределах организации.
CREATE INDEX "notifications_organization_id_created_at_idx"
  ON "notifications" ("organization_id", "created_at");

-- Счётчик непрочитанных.
CREATE INDEX "notifications_organization_id_read_at_idx"
  ON "notifications" ("organization_id", "read_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "organization_members"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

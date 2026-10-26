-- Фундамент программы уведомлений (docs/notifications/DATA_MODEL_DELTA.md).
-- Строго аддитивно: две nullable-колонки и пять новых таблиц. Ни одна
-- существующая запись не затрагивается; rollback = не писать в новые таблицы.
--
-- FK у notification_deliveries и scheduled_notifications НЕ объявляются
-- намеренно: журнал и расписание должны переживать удаление
-- событий/регистраций — Cascade стёр бы историю доставок.

-- IANA-таймзона события ('Asia/Tashkent'). NULL = платформенный дефолт.
-- Нужна цепочкам REM/CLS/SUM: «T−24h в TZ события» и quiet hours (OQ-18).
ALTER TABLE "events" ADD COLUMN "timezone" TEXT;

-- Локаль интерфейса ('ru'|'uz'|'en'). NULL = 'ru' (текущее де-факто писем).
ALTER TABLE "accounts" ADD COLUMN "locale" TEXT;

-- Push-токены устройств. Привязка к Account (единая identity); пара
-- (account, installation) — identity устройства, expo_push_token ротируется.
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    -- Локаль устройства — единственный способ локализовать killed-push.
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "app_version" TEXT,
    "os_version" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMP(3),
    -- 'logout' | 'device_not_registered' — источник деактивации.
    "disabled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- Ключ PUT-upsert'а.
CREATE UNIQUE INDEX "device_tokens_account_id_installation_id_key"
  ON "device_tokens"("account_id", "installation_id");

-- Fan-out: активные токены аккаунта.
CREATE INDEX "device_tokens_account_id_disabled_at_idx"
  ON "device_tokens"("account_id", "disabled_at");

-- Обратный поиск по receipt'у DeviceNotRegistered.
CREATE INDEX "device_tokens_expo_push_token_idx"
  ON "device_tokens"("expo_push_token");

-- Stale-reaper (90д не шлём / 180д hard-cleanup строк).
CREATE INDEX "device_tokens_last_seen_at_idx"
  ON "device_tokens"("last_seen_at");

ALTER TABLE "device_tokens"
  ADD CONSTRAINT "device_tokens_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Матрица преференсов: строка существует только при отклонении от дефолта
-- (дефолты — в коде, GET мёржит). key — TEXT, не enum БД: новый ключ без
-- миграции, валидация в DTO.
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_account_id_key_key"
  ON "notification_preferences"("account_id", "key");

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Журнал доставок + замок идемпотентности: рестарт воркера/двойной вызов
-- упирается в unique (dedup_key, account_id, channel) → P2002 → noop (BL-01).
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "dedup_key" TEXT NOT NULL,
    -- ID из NOTIFICATIONS_CATALOG (напр. 'REM-01').
    "catalog_id" TEXT NOT NULL,
    -- 'push' | 'email' | 'in_app'
    "channel" TEXT NOT NULL,
    -- Получатель: ровно одно из двух заполнено.
    "account_id" UUID,
    "organization_id" UUID,
    -- Денормализованные ссылки для каскадной инвалидации и диагностики.
    "event_id" UUID,
    "registration_id" UUID,
    "order_id" UUID,
    -- 'scheduled' | 'enqueued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
    -- | 'skipped' | 'suppressed_rate_limit' | 'suppressed_preference'
    -- | 'suppressed_unsubscribe'
    "status" TEXT NOT NULL DEFAULT 'enqueued',
    -- Снапшот аргументов шаблона — для ресенда и разбора инцидентов.
    "payload" JSONB,
    "error" TEXT,
    -- Expo push ticket id — для сверки receipts.
    "provider_ref" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_deliveries_dedup_key_account_id_channel_key"
  ON "notification_deliveries"("dedup_key", "account_id", "channel");

CREATE INDEX "notification_deliveries_account_id_created_at_idx"
  ON "notification_deliveries"("account_id", "created_at");

CREATE INDEX "notification_deliveries_event_id_idx"
  ON "notification_deliveries"("event_id");

CREATE INDEX "notification_deliveries_registration_id_idx"
  ON "notification_deliveries"("registration_id");

-- Reaper «застрявших enqueued» + failed-мониторинг.
CREATE INDEX "notification_deliveries_status_created_at_idx"
  ON "notification_deliveries"("status", "created_at");

-- Аналитика по типам каталога.
CREATE INDEX "notification_deliveries_catalog_id_created_at_idx"
  ON "notification_deliveries"("catalog_id", "created_at");

-- Плановые уведомления: источник истины — БД, не Redis (flush BullMQ не
-- должен терять напоминания). Тик планировщика выбирает due-строки.
CREATE TABLE "scheduled_notifications" (
    "id" UUID NOT NULL,
    "catalog_id" TEXT NOT NULL,
    -- Совпадает с будущим dedup_key доставки — повторное планирование = noop.
    "dedup_key" TEXT NOT NULL,
    -- UTC-момент; TZ-математика — при планировании.
    "run_at" TIMESTAMP(3) NOT NULL,
    -- 'scheduled' | 'dispatched' | 'cancelled' | 'skipped'
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    -- Каскадная инвалидация: cancelBy({eventId|registrationId|orderId}).
    "event_id" UUID,
    "registration_id" UUID,
    "order_id" UUID,
    "account_id" UUID,
    "organization_id" UUID,
    -- Контекст guard-проверки и построения текста в момент исполнения.
    "context" JSONB,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scheduled_notifications_dedup_key_key"
  ON "scheduled_notifications"("dedup_key");

-- Тик планировщика: WHERE status='scheduled' AND run_at <= now().
CREATE INDEX "scheduled_notifications_status_run_at_idx"
  ON "scheduled_notifications"("status", "run_at");

-- Каскадная отмена по событию / регистрации / заказу.
CREATE INDEX "scheduled_notifications_event_id_status_idx"
  ON "scheduled_notifications"("event_id", "status");

CREATE INDEX "scheduled_notifications_registration_id_status_idx"
  ON "scheduled_notifications"("registration_id", "status");

CREATE INDEX "scheduled_notifications_order_id_status_idx"
  ON "scheduled_notifications"("order_id", "status");

-- Участнический in-app инбокс. Отдельная таблица, а не расширение
-- notifications: там organization_id NOT NULL + Cascade FK, участнику
-- организация не нужна, а снятие constraint'а не аддитивно. Та же философия:
-- type + payload, никаких готовых фраз; персональный read_at с рождения.
CREATE TABLE "account_notifications" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    -- AccountNotificationType (CONTRACT_DIFF §5) — TEXT, не enum БД.
    "type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "payload" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_notifications_pkey" PRIMARY KEY ("id")
);

-- Лента: свежие сверху.
CREATE INDEX "account_notifications_account_id_created_at_idx"
  ON "account_notifications"("account_id", "created_at");

-- Unread-count.
CREATE INDEX "account_notifications_account_id_read_at_idx"
  ON "account_notifications"("account_id", "read_at");

ALTER TABLE "account_notifications"
  ADD CONSTRAINT "account_notifications_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

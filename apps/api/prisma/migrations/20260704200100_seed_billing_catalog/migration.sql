-- D-15: seed каталога монетизации (структурные значения из §1 бизнес-модели +
-- решения 10-decisions.md). Идемпотентно (ON CONFLICT DO NOTHING), аддитивно.
--
-- ВАЖНО (внешний гейт №4): UZS-цены НЕ засеяны (price_amount_minor = NULL) и
-- продаваемость выключена (is_purchasable/is_active = false у платных строк) —
-- владелец задаёт цены через S-16, после чего строки активируются. USD-якоря
-- из §1 засеяны как маркетинговые ($599/$999/$35/$15/от $50).
--
-- statsTier = BASIC у ВСЕХ тарифов: прогнозирование/SLA на запуске не продаются
-- (решение B-4); поле переключит оператор, когда фича появится.
-- qr_mode = ARRIVAL_ONLY у всех: расширенные режимы зарезервированы (E-9/OQ-4).
-- generation_credits: START 50/календарный месяц; PRO 200 и EXCLUSIVE 500 на
-- период пакета (решение A-5). validity_days = 90 (поправка владельца §2.1).

INSERT INTO "plans" (
  "id", "key", "price_amount_minor", "usd_anchor_cents", "is_purchasable", "is_active",
  "event_credits", "validity_days", "commission_bps",
  "ai_minutes_monthly", "generation_credits", "generation_window",
  "staff_seats", "max_participants_per_event", "task_board_enabled",
  "stats_tier", "qr_mode", "sort_order", "created_at", "updated_at"
) VALUES
  (gen_random_uuid(), 'START',     NULL, NULL,  false, true,
   0,  NULL, 1200, 0,   50,  'CALENDAR_MONTH', 1,  50,  false, 'BASIC', 'ARRIVAL_ONLY', 0, NOW(), NOW()),
  (gen_random_uuid(), 'PRO',       NULL, 59900, false, false,
   5,  90,   800,  150, 200, 'PACK_PERIOD',    3,  400, true,  'BASIC', 'ARRIVAL_ONLY', 1, NOW(), NOW()),
  (gen_random_uuid(), 'EXCLUSIVE', NULL, 99900, false, false,
   10, 90,   600,  350, 500, 'PACK_PERIOD',    10, 600, true,  'BASIC', 'ARRIVAL_ONLY', 2, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Пакеты монет (CR-26: AI хранится в секундах — 100 минут = 6000 секунд).
INSERT INTO "addon_skus" (
  "id", "code", "kind", "price_amount_minor", "usd_anchor_cents", "is_active",
  "coin_metric", "coin_quantity", "ad_billing_unit", "sort_order", "created_at", "updated_at"
) VALUES
  (gen_random_uuid(), 'COIN_AI_100MIN', 'COIN_PACK', NULL, 3500, false,
   'AI_SECONDS', 6000, NULL, 0, NOW(), NOW()),
  (gen_random_uuid(), 'COIN_GEN_100', 'COIN_PACK', NULL, 1500, false,
   'GENERATION_UNITS', 100, NULL, 1, NOW(), NOW()),
-- Рекламные SKU (решение D-2 группы D): featured/неделя + email/кампания на
-- запуске; SMS — «скоро» (P2, провайдера нет). Цены-floor задаёт владелец.
  (gen_random_uuid(), 'AD_FEATURED_WEEK', 'AD_PRODUCT', NULL, 5000, false,
   NULL, NULL, 'PER_WEEK', 10, NOW(), NOW()),
  (gen_random_uuid(), 'AD_EMAIL_CAMPAIGN', 'AD_PRODUCT', NULL, 5000, false,
   NULL, NULL, 'PER_CAMPAIGN', 11, NOW(), NOW()),
  (gen_random_uuid(), 'AD_SMS_CAMPAIGN', 'AD_PRODUCT', NULL, NULL, false,
   NULL, NULL, 'PER_MESSAGE', 12, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

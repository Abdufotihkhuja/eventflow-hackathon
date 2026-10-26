-- Интеграция платёжного провайдера VIA (hosted-invoice чекаут, UZCARD/HUMO).
-- Enum-additive: значения только добавляются, существующие строки не трогаются.

-- Провайдер платежа для payment_transactions.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'VIA';

-- Канал выручки для revenue_entries.
ALTER TYPE "RevenueChannel" ADD VALUE IF NOT EXISTS 'VIA';

-- Per-org включение VIA (valueBool) поверх глобального тумблера via_payments:
-- true — пилот/тест для отдельных организаций, false — точечное отключение.
ALTER TYPE "EntitlementKey" ADD VALUE IF NOT EXISTS 'VIA_PAYMENTS';

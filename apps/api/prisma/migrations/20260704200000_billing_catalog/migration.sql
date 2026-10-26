-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('START', 'PRO', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "GenerationWindow" AS ENUM ('CALENDAR_MONTH', 'PACK_PERIOD');

-- CreateEnum
CREATE TYPE "StatsTier" AS ENUM ('BASIC', 'FORECASTING', 'FORECASTING_SLA');

-- CreateEnum
CREATE TYPE "QrCheckInMode" AS ENUM ('ARRIVAL_ONLY', 'EXTENDED');

-- CreateEnum
CREATE TYPE "AddonSkuKind" AS ENUM ('COIN_PACK', 'AD_PRODUCT');

-- CreateEnum
CREATE TYPE "CoinMetric" AS ENUM ('AI_SECONDS', 'GENERATION_UNITS');

-- CreateEnum
CREATE TYPE "AdBillingUnit" AS ENUM ('PER_WEEK', 'PER_CAMPAIGN', 'PER_MESSAGE');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "key" "PlanKey" NOT NULL,
    "price_amount_minor" BIGINT,
    "usd_anchor_cents" INTEGER,
    "is_purchasable" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "event_credits" INTEGER NOT NULL DEFAULT 0,
    "validity_days" INTEGER,
    "commission_bps" INTEGER NOT NULL,
    "ai_minutes_monthly" INTEGER NOT NULL DEFAULT 0,
    "generation_credits" INTEGER NOT NULL DEFAULT 0,
    "generation_window" "GenerationWindow" NOT NULL DEFAULT 'CALENDAR_MONTH',
    "staff_seats" INTEGER NOT NULL DEFAULT 1,
    "max_participants_per_event" INTEGER,
    "task_board_enabled" BOOLEAN NOT NULL DEFAULT false,
    "stats_tier" "StatsTier" NOT NULL DEFAULT 'BASIC',
    "qr_mode" "QrCheckInMode" NOT NULL DEFAULT 'ARRIVAL_ONLY',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_skus" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "AddonSkuKind" NOT NULL,
    "price_amount_minor" BIGINT,
    "usd_anchor_cents" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "coin_metric" "CoinMetric",
    "coin_quantity" INTEGER,
    "ad_billing_unit" "AdBillingUnit",
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addon_skus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_key_key" ON "plans"("key");

-- CreateIndex
CREATE UNIQUE INDEX "addon_skus_code_key" ON "addon_skus"("code");


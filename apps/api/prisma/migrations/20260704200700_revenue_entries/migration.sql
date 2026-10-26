-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('PLAN_FEE', 'COMMISSION', 'COIN_PACK', 'ADVERTISING', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RevenueChannel" AS ENUM ('MANUAL', 'PAYME', 'CLICK', 'STRIPE');

-- CreateTable
CREATE TABLE "revenue_entries" (
    "id" UUID NOT NULL,
    "organization_ref" UUID NOT NULL,
    "organization_label" TEXT,
    "type" "RevenueType" NOT NULL,
    "channel" "RevenueChannel" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "source_ref" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revenue_entries_organization_ref_idx" ON "revenue_entries"("organization_ref");

-- CreateIndex
CREATE INDEX "revenue_entries_type_occurred_at_idx" ON "revenue_entries"("type", "occurred_at");

-- CreateIndex
CREATE INDEX "revenue_entries_channel_occurred_at_idx" ON "revenue_entries"("channel", "occurred_at");


-- CreateEnum
CREATE TYPE "DrainSource" AS ENUM ('PLAN_QUOTA', 'COIN');

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric" "CoinMetric" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "drain_source" "DrainSource" NOT NULL,
    "plan_purchase_id" UUID,
    "event_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric" "CoinMetric" NOT NULL,
    "period_key" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_events_organization_id_metric_period_key_idx" ON "usage_events"("organization_id", "metric", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_organization_id_metric_idempotency_key_key" ON "usage_events"("organization_id", "metric", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_organization_id_metric_period_key_key" ON "usage_counters"("organization_id", "metric", "period_key");

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


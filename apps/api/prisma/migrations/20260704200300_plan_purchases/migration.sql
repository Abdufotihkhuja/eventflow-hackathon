-- CreateEnum
CREATE TYPE "PlanPurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXHAUSTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PlanCreditAdjustmentKind" AS ENUM ('ADMIN_ADJUST', 'CARRY_OVER', 'REFUND');

-- CreateTable
CREATE TABLE "plan_purchases" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "order_id" UUID,
    "status" "PlanPurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "plan_key_snapshot" "PlanKey" NOT NULL,
    "price_amount_minor_snapshot" BIGINT,
    "commission_bps_snapshot" INTEGER NOT NULL,
    "event_credits_granted" INTEGER NOT NULL,
    "event_credits_remaining" INTEGER NOT NULL,
    "ai_minutes_monthly_snapshot" INTEGER NOT NULL,
    "generation_credits_snapshot" INTEGER NOT NULL,
    "generation_window_snapshot" "GenerationWindow" NOT NULL,
    "staff_seats_snapshot" INTEGER NOT NULL,
    "max_participants_snapshot" INTEGER,
    "task_board_enabled_snapshot" BOOLEAN NOT NULL,
    "stats_tier_snapshot" "StatsTier" NOT NULL,
    "qr_mode_snapshot" "QrCheckInMode" NOT NULL,
    "validity_days_snapshot" INTEGER,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "superseded_at" TIMESTAMP(3),
    "superseded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_credit_consumptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_purchase_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refunded_at" TIMESTAMP(3),

    CONSTRAINT "event_credit_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_credit_adjustments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_purchase_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "kind" "PlanCreditAdjustmentKind" NOT NULL,
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_credit_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_purchases_order_id_key" ON "plan_purchases"("order_id");

-- CreateIndex
CREATE INDEX "plan_purchases_organization_id_status_idx" ON "plan_purchases"("organization_id", "status");

-- CreateIndex
CREATE INDEX "plan_purchases_expires_at_idx" ON "plan_purchases"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_credit_consumptions_event_id_key" ON "event_credit_consumptions"("event_id");

-- CreateIndex
CREATE INDEX "event_credit_consumptions_organization_id_idx" ON "event_credit_consumptions"("organization_id");

-- CreateIndex
CREATE INDEX "event_credit_consumptions_plan_purchase_id_idx" ON "event_credit_consumptions"("plan_purchase_id");

-- CreateIndex
CREATE INDEX "plan_credit_adjustments_organization_id_idx" ON "plan_credit_adjustments"("organization_id");

-- CreateIndex
CREATE INDEX "plan_credit_adjustments_plan_purchase_id_idx" ON "plan_credit_adjustments"("plan_purchase_id");

-- AddForeignKey
ALTER TABLE "plan_purchases" ADD CONSTRAINT "plan_purchases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_purchases" ADD CONSTRAINT "plan_purchases_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_purchases" ADD CONSTRAINT "plan_purchases_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_purchases" ADD CONSTRAINT "plan_purchases_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "plan_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_credit_consumptions" ADD CONSTRAINT "event_credit_consumptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_credit_consumptions" ADD CONSTRAINT "event_credit_consumptions_plan_purchase_id_fkey" FOREIGN KEY ("plan_purchase_id") REFERENCES "plan_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_credit_adjustments" ADD CONSTRAINT "plan_credit_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_credit_adjustments" ADD CONSTRAINT "plan_credit_adjustments_plan_purchase_id_fkey" FOREIGN KEY ("plan_purchase_id") REFERENCES "plan_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;


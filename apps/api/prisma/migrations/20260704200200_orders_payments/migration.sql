-- CreateEnum
CREATE TYPE "OrderKind" AS ENUM ('PLAN', 'COIN_PACK', 'ADVERTISING', 'TICKET_SALE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('REQUESTED', 'PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'PAYME', 'CLICK', 'STRIPE');

-- CreateEnum
CREATE TYPE "PaymentTxStatus" AS ENUM ('CREATED', 'CONFIRMED', 'FAILED', 'REVERSED');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" "OrderKind" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "plan_id" UUID,
    "addon_sku_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "event_id" UUID,
    "registration_id" UUID,
    "amount_minor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "commission_bps_snapshot" INTEGER,
    "commission_amount_minor" BIGINT,
    "hold_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_txn_id" TEXT NOT NULL,
    "status" "PaymentTxStatus" NOT NULL DEFAULT 'CREATED',
    "amount_minor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "payload_scrubbed" JSONB NOT NULL DEFAULT '{}',
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_registration_id_key" ON "orders"("registration_id");

-- CreateIndex
CREATE INDEX "orders_organization_id_idx" ON "orders"("organization_id");

-- CreateIndex
CREATE INDEX "orders_kind_status_idx" ON "orders"("kind", "status");

-- CreateIndex
CREATE INDEX "orders_hold_expires_at_idx" ON "orders"("hold_expires_at");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_txn_id_key" ON "payment_transactions"("provider", "provider_txn_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_addon_sku_id_fkey" FOREIGN KEY ("addon_sku_id") REFERENCES "addon_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


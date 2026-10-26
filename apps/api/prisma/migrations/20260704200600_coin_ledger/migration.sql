-- CreateEnum
CREATE TYPE "CoinLedgerEntryKind" AS ENUM ('PURCHASE', 'COMP_GRANT', 'CONSUMPTION', 'REVERSAL');

-- CreateTable
CREATE TABLE "coin_ledger_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric" "CoinMetric" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "kind" "CoinLedgerEntryKind" NOT NULL,
    "order_id" UUID,
    "usage_event_id" UUID,
    "created_by_admin_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coin_ledger_entries_organization_id_metric_created_at_idx" ON "coin_ledger_entries"("organization_id", "metric", "created_at");

-- AddForeignKey
ALTER TABLE "coin_ledger_entries" ADD CONSTRAINT "coin_ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CR-14: страховка на уровне БД — баланс монет не может уйти в минус.
-- (Prisma не выражает CHECK в датамодели; ручное дополнение по конвенции
-- hand-authored миграций.)
ALTER TABLE "coin_ledger_entries"
  ADD CONSTRAINT "coin_ledger_entries_balance_after_non_negative"
  CHECK ("balance_after" >= 0);

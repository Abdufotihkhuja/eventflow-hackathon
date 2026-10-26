-- CreateEnum
CREATE TYPE "EntitlementKey" AS ENUM ('COMMISSION_BPS', 'STAFF_SEATS', 'MAX_PARTICIPANTS_PER_EVENT', 'GENERATION_CREDITS', 'AI_MINUTES_MONTHLY', 'TASK_BOARD_ENABLED', 'STATS_TIER', 'QR_MODE', 'EVENT_CREDITS');

-- CreateTable
CREATE TABLE "entitlement_overrides" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" "EntitlementKey" NOT NULL,
    "value_int" INTEGER,
    "value_bool" BOOLEAN,
    "value_string" TEXT,
    "reason" TEXT NOT NULL,
    "created_by_admin_id" UUID,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlement_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entitlement_overrides_expires_at_idx" ON "entitlement_overrides"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_overrides_organization_id_key_key" ON "entitlement_overrides"("organization_id", "key");

-- AddForeignKey
ALTER TABLE "entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


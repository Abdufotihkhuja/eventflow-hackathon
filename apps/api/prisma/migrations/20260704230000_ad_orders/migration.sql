-- CreateEnum
CREATE TYPE "AdOrderStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ad_orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "order_id" UUID,
    "event_id" UUID,
    "sku_code" TEXT NOT NULL,
    "status" "AdOrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_comp" BOOLEAN NOT NULL DEFAULT false,
    "placement_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "placement_end" TIMESTAMP(3),
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_orders_order_id_key" ON "ad_orders"("order_id");

-- CreateIndex
CREATE INDEX "ad_orders_organization_id_status_idx" ON "ad_orders"("organization_id", "status");

-- CreateIndex
CREATE INDEX "ad_orders_status_placement_end_idx" ON "ad_orders"("status", "placement_end");

-- AddForeignKey
ALTER TABLE "ad_orders" ADD CONSTRAINT "ad_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_orders" ADD CONSTRAINT "ad_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_orders" ADD CONSTRAINT "ad_orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Решение D-3 группы D: существующие featured-события грандфазерятся как
-- $0 comp-размещения (честный след; публичная витрина не дёргается).
-- Бессрочные (placement_end NULL) — оператор может завершить вручную (S-11).
INSERT INTO "ad_orders" (
  "id", "organization_id", "event_id", "sku_code", "status", "is_comp",
  "placement_start", "created_at", "updated_at"
)
SELECT gen_random_uuid(), e."organization_id", e."id", 'AD_FEATURED_WEEK',
       'ACTIVE', true, NOW(), NOW(), NOW()
FROM "events" e
WHERE e."is_featured" = true AND e."deleted_at" IS NULL
ON CONFLICT DO NOTHING;

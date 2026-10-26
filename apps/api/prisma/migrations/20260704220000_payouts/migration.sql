-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "external_ref" TEXT,
    "marked_paid_by_id" UUID,
    "marked_paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payouts_organization_id_status_idx" ON "payouts"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


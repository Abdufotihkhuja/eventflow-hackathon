-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_by_id" UUID,
ADD COLUMN     "suspended_reason" TEXT;

-- CreateTable
CREATE TABLE "platform_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_admin_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("key")
);


-- S-19: мастер-переключатель тарифной системы. Засеян ВЫКЛЮЧЕННЫМ —
-- платформа ведёт себя как до монетизации, пока супер-админ не включит.
INSERT INTO "platform_config" ("key", "value", "updated_at")
VALUES ('billing_enforcement', '{"enabled": false}', NOW())
ON CONFLICT ("key") DO NOTHING;

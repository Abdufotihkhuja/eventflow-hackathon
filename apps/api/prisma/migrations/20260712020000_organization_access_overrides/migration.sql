-- Маска доступа организации: deny-list прав, закрытых супер-админом для всей
-- организации (включая владельца). Пустая маска = поведение как раньше.
CREATE TABLE "organization_access_overrides" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "permission_code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_access_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_access_overrides_organization_id_idx" ON "organization_access_overrides"("organization_id");

CREATE UNIQUE INDEX "organization_access_overrides_organization_id_permission_cod_key" ON "organization_access_overrides"("organization_id", "permission_code");

ALTER TABLE "organization_access_overrides" ADD CONSTRAINT "organization_access_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

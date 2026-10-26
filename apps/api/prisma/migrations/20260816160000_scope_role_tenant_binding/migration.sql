-- Additive canonical role projection for Membership. It remains nullable until
-- the resumable backfill and dual-read gate have completed.
ALTER TABLE "memberships" ADD COLUMN "role_id" UUID;

-- PostgreSQL requires a unique referenced key for the composite tenant FK.
ALTER TABLE "organization_roles"
  ADD CONSTRAINT "organization_roles_organization_id_id_key"
  UNIQUE ("organization_id", "id");

CREATE INDEX "memberships_organization_id_role_id_idx"
  ON "memberships"("organization_id", "role_id");

-- Keep the historical role_id FK during the compatibility window and add the
-- stricter tenant-consistent invariant alongside it.
ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_organization_id_role_id_fkey"
  FOREIGN KEY ("organization_id", "role_id")
  REFERENCES "organization_roles"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_organization_id_role_id_fkey"
  FOREIGN KEY ("organization_id", "role_id")
  REFERENCES "organization_roles"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "organization_invites" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" UUID,
    "role_id" UUID NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "position" TEXT,
    "department" TEXT,
    "accepted_at" TIMESTAMP(3),
    "accepted_by_user_id" UUID,
    "accepted_member_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_invites_token_hash_key" ON "organization_invites"("token_hash");

-- CreateIndex
CREATE INDEX "organization_invites_organization_id_idx" ON "organization_invites"("organization_id");

-- CreateIndex
CREATE INDEX "organization_invites_email_idx" ON "organization_invites"("email");

-- CreateIndex
CREATE INDEX "organization_invites_user_id_idx" ON "organization_invites"("user_id");

-- CreateIndex
-- Partial unique index: at most one PENDING invite per (organization, normalized email).
-- Filtered indexes are not expressible in the Prisma schema, so it is managed here
-- and enforced again at the application layer (PENDING_INVITE_ALREADY_EXISTS).
CREATE UNIQUE INDEX "organization_invites_org_email_pending_key"
    ON "organization_invites"("organization_id", "email")
    WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "organization_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invalidate legacy raw invitation tokens.
-- Pre-existing pending invites stored a raw token directly on organization_members.
-- The new flow stores only a hash in organization_invites, so legacy raw links are
-- intentionally invalidated here (the admin can re-send through the new flow).
-- The INVITED member rows are kept so existing references stay intact.
UPDATE "organization_members"
SET "invitation_token" = NULL,
    "token_expires_at" = NULL
WHERE "status" = 'INVITED'
  AND "invitation_token" IS NOT NULL;

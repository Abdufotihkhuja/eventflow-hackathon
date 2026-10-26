-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('USER', 'ORGANIZATION', 'MEMBER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "MembershipKind" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "account_id" UUID;

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identities" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "email" TEXT NOT NULL,
    "provider_id" TEXT,
    "password_hash" TEXT,
    "actor_type" "UserType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "organization_member_id" UUID,
    "kind" "MembershipKind" NOT NULL,
    "role_name" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_grants" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "super_admin_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admin_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_email_idx" ON "accounts"("email");

-- CreateIndex
CREATE INDEX "identities_account_id_idx" ON "identities"("account_id");
CREATE INDEX "identities_email_idx" ON "identities"("email");
CREATE UNIQUE INDEX "identities_actor_type_actor_id_key" ON "identities"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "memberships_account_id_idx" ON "memberships"("account_id");
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");
CREATE UNIQUE INDEX "memberships_account_id_organization_id_kind_key" ON "memberships"("account_id", "organization_id", "kind");
CREATE UNIQUE INDEX "memberships_organization_member_id_key" ON "memberships"("organization_member_id");

-- CreateIndex
CREATE INDEX "platform_admin_grants_account_id_idx" ON "platform_admin_grants"("account_id");
CREATE INDEX "platform_admin_grants_super_admin_id_idx" ON "platform_admin_grants"("super_admin_id");
CREATE UNIQUE INDEX "platform_admin_grants_account_id_super_admin_id_key" ON "platform_admin_grants"("account_id", "super_admin_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_account_id_idx" ON "refresh_tokens"("account_id");

-- AddForeignKey
ALTER TABLE "identities" ADD CONSTRAINT "identities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_member_id_fkey" FOREIGN KEY ("organization_member_id") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admin_grants" ADD CONSTRAINT "platform_admin_grants_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_admin_grants" ADD CONSTRAINT "platform_admin_grants_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

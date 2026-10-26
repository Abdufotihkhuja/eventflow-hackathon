-- AlterTable: User - добавляем поля профиля и soft delete
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "location" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: Organization - добавляем soft delete
ALTER TABLE "organizations" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: OrganizationMember - добавляем аватар и soft delete
ALTER TABLE "organization_members" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "organization_members" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: SuperAdmin - добавляем soft delete
ALTER TABLE "super_admins" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: RefreshToken - добавляем поля для сессий
ALTER TABLE "refresh_tokens" ADD COLUMN "user_agent" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: RefreshToken - индексы для быстрого поиска сессий
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_organization_id_idx" ON "refresh_tokens"("organization_id");
CREATE INDEX "refresh_tokens_member_id_idx" ON "refresh_tokens"("member_id");
CREATE INDEX "refresh_tokens_super_admin_id_idx" ON "refresh_tokens"("super_admin_id");


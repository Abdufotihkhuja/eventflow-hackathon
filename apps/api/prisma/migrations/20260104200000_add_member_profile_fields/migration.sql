-- AlterTable: Добавляем поля профиля для сотрудников организации
ALTER TABLE "organization_members" ADD COLUMN "bio" TEXT;
ALTER TABLE "organization_members" ADD COLUMN "location" VARCHAR(255);
ALTER TABLE "organization_members" ADD COLUMN "is_public_profile" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organization_members" ADD COLUMN "show_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organization_members" ADD COLUMN "show_phone" BOOLEAN NOT NULL DEFAULT false;


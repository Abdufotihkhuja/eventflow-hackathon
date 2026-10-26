-- AlterTable: User - добавляем настройки приватности
ALTER TABLE "users" ADD COLUMN "is_public_profile" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "show_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "show_phone" BOOLEAN NOT NULL DEFAULT false;


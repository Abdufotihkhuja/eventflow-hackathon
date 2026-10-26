-- AlterTable
ALTER TABLE "organization_members" 
  -- Меняем name на first_name и last_name
  ADD COLUMN "first_name" TEXT,
  ADD COLUMN "last_name" TEXT,
  
  -- Делаем password_hash опциональным (nullable)
  ALTER COLUMN "password_hash" DROP NOT NULL,
  
  -- Добавляем новые поля
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "position" TEXT,
  ADD COLUMN "department" TEXT,
  ADD COLUMN "invitation_sent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "invitation_token" TEXT,
  ADD COLUMN "token_expires_at" TIMESTAMP(3);

-- Мигрируем данные из name в first_name (временно)
UPDATE "organization_members" 
SET "first_name" = "name", 
    "last_name" = ''
WHERE "first_name" IS NULL;

-- Делаем first_name и last_name обязательными
ALTER TABLE "organization_members"
  ALTER COLUMN "first_name" SET NOT NULL,
  ALTER COLUMN "last_name" SET NOT NULL;

-- Удаляем старую колонку name
ALTER TABLE "organization_members" DROP COLUMN "name";

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_invitation_token_key" ON "organization_members"("invitation_token");

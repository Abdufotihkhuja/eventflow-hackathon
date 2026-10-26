-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITED');

-- AlterTable
ALTER TABLE "organization_members" ADD COLUMN "status" "MemberStatus";

-- Миграция данных: переносим isActive в status
-- Если isActive = true И есть пароль -> ACTIVE
-- Если isActive = true И нет пароля -> INVITED (ожидает активации)
-- Если isActive = false -> SUSPENDED
UPDATE "organization_members"
SET "status" = CASE
  WHEN "is_active" = true AND "password_hash" IS NOT NULL THEN 'ACTIVE'::"MemberStatus"
  WHEN "is_active" = true AND "password_hash" IS NULL THEN 'INVITED'::"MemberStatus"
  WHEN "is_active" = false THEN 'SUSPENDED'::"MemberStatus"
END
WHERE "status" IS NULL;

-- Делаем status обязательным с дефолтом INVITED
ALTER TABLE "organization_members" 
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'INVITED'::"MemberStatus";

-- Удаляем старую колонку is_active
ALTER TABLE "organization_members" DROP COLUMN "is_active";

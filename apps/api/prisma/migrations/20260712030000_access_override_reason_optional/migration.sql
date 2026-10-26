-- Причина закрытия права становится необязательной (аудит всё равно пишется).
ALTER TABLE "organization_access_overrides" ALTER COLUMN "reason" DROP NOT NULL;

-- Когда и почему отказались. Причина необязательна: отказ без объяснения —
-- нормальный сценарий, но если человек написал, организатор это увидит.

ALTER TABLE "organization_invites"
  ADD COLUMN "declined_at" TIMESTAMP(3),
  ADD COLUMN "decline_reason" TEXT;

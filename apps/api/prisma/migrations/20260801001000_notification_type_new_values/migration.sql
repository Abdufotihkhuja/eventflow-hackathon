-- Расширение enum NotificationType (организаторская лента) значениями
-- программы уведомлений (CONTRACT_DIFF §5). Отдельная миграция: Postgres
-- запрещает использовать новое enum-значение в той же транзакции, где оно
-- добавлено, поэтому ADD VALUE отделён от любого кода/данных, которые эти
-- значения используют (DATA_MODEL_DELTA §8, шаг 8).

ALTER TYPE "NotificationType" ADD VALUE 'EVENT_SUBMITTED';        -- MOD-01
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CHANGES_REQUESTED'; -- MOD-04 kind=changes_requested
ALTER TYPE "NotificationType" ADD VALUE 'REGISTRATION_FIRST';      -- REG-20
ALTER TYPE "NotificationType" ADD VALUE 'CAPACITY_THRESHOLD';      -- REG-21
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_REFUND';           -- REG-23
ALTER TYPE "NotificationType" ADD VALUE 'REGISTRATION_CLOSED';     -- CLS-03/CLS-04
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_SUMMARY';           -- SUM-02

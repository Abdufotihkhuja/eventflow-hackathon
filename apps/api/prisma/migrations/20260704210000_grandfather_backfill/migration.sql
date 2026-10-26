-- D-14: грандфазер-бэкфилл (решение B-3, CR-5).
-- START — null-object: организациям БЕЗ превышений строки не нужны вовсе
-- (отсутствие ACTIVE-пакета == START-семантика в E-1). Оверрайды создаются
-- ТОЛЬКО для организаций, уже превышающих лимиты START, чтобы включение
-- энфорсмента (S-19) ничего у них не отняло: «блокируем новое, не трогаем
-- существующее» (E-15).
--
-- expires_at НАМЕРЕННО NULL: 90-дневное окно (B-3) отсчитывается от момента
-- ВКЛЮЧЕНИЯ мастер-переключателя, а не от деплоя миграции — штамп ставит
-- BillingConfigService.setEnforcementEnabled (E-15) по reason-маркеру.
-- created_by_admin_id NULL = системный грант миграции (D-6).

-- Сотрудники: у START лимит 1 (владелец). Организациям с бОльшим числом
-- живых сотрудников фиксируем текущее количество.
INSERT INTO "entitlement_overrides"
  ("id", "organization_id", "key", "value_int", "reason", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  m."organization_id",
  'STAFF_SEATS',
  m."cnt",
  'GRANDFATHER: сотрудников больше лимита START на момент запуска монетизации',
  NOW(),
  NOW()
FROM (
  SELECT "organization_id", COUNT(*)::int AS "cnt"
  FROM "organization_members"
  WHERE "deleted_at" IS NULL
  GROUP BY "organization_id"
  HAVING COUNT(*) > 1
) m
ON CONFLICT ("organization_id", "key") DO NOTHING;

-- Task Board: у START доски выключены. Организациям с существующими досками —
-- грант, чтобы включение энфорсмента не запирало живую работу (E-5/C-10:
-- после истечения окна доски становятся read-only, НЕ удаляются).
INSERT INTO "entitlement_overrides"
  ("id", "organization_id", "key", "value_bool", "reason", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  b."organization_id",
  'TASK_BOARD_ENABLED',
  true,
  'GRANDFATHER: активные доски задач на момент запуска монетизации',
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "organization_id" FROM "boards"
) b
ON CONFLICT ("organization_id", "key") DO NOTHING;

-- Пер-событийный кап участников: события, созданные ДО включения энфорсмента,
-- грандфазерятся НАВСЕГДА (B-3 п.3) — это правило времени исполнения в E-3
-- (сравнение с billing_enforcement.enabledAt), строк здесь не требует.

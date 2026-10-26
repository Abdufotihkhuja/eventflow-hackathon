INSERT INTO "permissions" ("id", "code", "name", "description", "category")
VALUES
  (gen_random_uuid(), 'dashboard:view', 'Просмотр панели', 'Доступ к главной панели организатора', 'dashboard'),
  (gen_random_uuid(), 'followers:read', 'Просмотр подписчиков', 'Просмотр списка подписчиков организации', 'followers'),
  (gen_random_uuid(), 'followers:export', 'Экспорт подписчиков', 'Экспорт списка подписчиков организации', 'followers'),
  (gen_random_uuid(), 'contacts:read', 'Просмотр заявок', 'Просмотр заявок на связь с организацией', 'contacts'),
  (gen_random_uuid(), 'contacts:update', 'Обработка заявок', 'Изменение статусов заявок на связь', 'contacts'),
  (gen_random_uuid(), 'billing:view', 'Просмотр тарифов и оплаты', 'Просмотр тарифов, дополнений и счетов', 'billing'),
  (gen_random_uuid(), 'billing:manage', 'Управление тарифами и оплатой', 'Изменение тарифа и платных дополнений', 'billing')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category";

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "organization_roles"."id", "permissions"."id"
FROM "organization_roles"
CROSS JOIN "permissions"
WHERE "organization_roles"."name" IN ('Владелец', 'Администратор')
  AND "permissions"."code" IN (
    'dashboard:view',
    'followers:read',
    'followers:export',
    'contacts:read',
    'contacts:update',
    'billing:view',
    'billing:manage'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "organization_roles"."id", "permissions"."id"
FROM "organization_roles"
CROSS JOIN "permissions"
WHERE "organization_roles"."name" IN ('Менеджер событий', 'Наблюдатель')
  AND "permissions"."code" = 'dashboard:view'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "organization_roles"."id", "permissions"."id"
FROM "organization_roles"
CROSS JOIN "permissions"
WHERE "organization_roles"."name" IN ('Координатор событий', 'Техподдержка')
  AND "permissions"."code" = 'dashboard:view'
ON CONFLICT DO NOTHING;

-- E-5 / PC-9: бэкфилл board-прав ПЕРЕД включением PermissionsGuard на
-- контроллере досок. Сегодня доски защищены только JwtAuthGuard — фактический
-- доступ есть у всех ролей организации. Гейт прав без бэкфилла отнял бы доступ
-- у кастомных ролей («блокируем новое, не отнимаем существующее», E-15).
-- Идемпотентно и аддитивно: выдаёт board-права ВСЕМ существующим ролям.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "organization_roles" r
CROSS JOIN "permissions" p
WHERE p."code" LIKE 'boards:%'
   OR p."code" LIKE 'columns:%'
   OR p."code" LIKE 'tasks:%'
   OR p."code" LIKE 'attachments:%'
   OR p."code" LIKE 'checklists:%'
   OR p."code" LIKE 'tags:%'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

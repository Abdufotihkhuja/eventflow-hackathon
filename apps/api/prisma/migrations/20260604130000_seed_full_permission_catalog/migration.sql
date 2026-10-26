-- Seed the full permission catalog + backfill default-role grants.
-- The catalog was previously populated ONLY by prisma/seed.ts (manual, not
-- run on prod), so prod / older orgs lacked events/boards/places/etc.
-- permissions — which made permission-gated nav items vanish after RBAC
-- gating shipped. This migration is idempotent and ADDITIVE ONLY: it inserts
-- catalog rows and role grants, and never revokes, so it cannot reduce access.

-- 1) Full permission catalog (source of truth: app constants / seed).
INSERT INTO "permissions" ("id", "code", "name", "description", "category") VALUES
  (gen_random_uuid(), 'agenda:create', 'Добавление пунктов программы', 'Добавление пунктов в программу события', 'agenda'),
  (gen_random_uuid(), 'agenda:delete', 'Удаление пунктов программы', 'Удаление пунктов из программы', 'agenda'),
  (gen_random_uuid(), 'agenda:read', 'Просмотр программы', 'Просмотр программы события', 'agenda'),
  (gen_random_uuid(), 'agenda:update', 'Редактирование программы', 'Изменение программы события', 'agenda'),
  (gen_random_uuid(), 'analytics:export', 'Экспорт аналитики', 'Экспорт аналитических данных', 'analytics'),
  (gen_random_uuid(), 'analytics:view', 'Просмотр аналитики', 'Доступ к аналитике и отчётам', 'analytics'),
  (gen_random_uuid(), 'attachments:create', 'Добавление вложений', 'Прикрепление файлов к задачам', 'attachments'),
  (gen_random_uuid(), 'attachments:delete', 'Удаление вложений', 'Удаление вложений из задач', 'attachments'),
  (gen_random_uuid(), 'attachments:read', 'Просмотр вложений', 'Просмотр и скачивание вложений', 'attachments'),
  (gen_random_uuid(), 'attendance:checkin', 'Отметка посещения', 'Отметка посещения (check-in)', 'attendance'),
  (gen_random_uuid(), 'attendance:export', 'Экспорт посещаемости', 'Экспорт отчётов посещаемости', 'attendance'),
  (gen_random_uuid(), 'attendance:read', 'Просмотр посещаемости', 'Просмотр отчётов посещаемости', 'attendance'),
  (gen_random_uuid(), 'billing:manage', 'Управление тарифами и оплатой', 'Изменение тарифа и платных дополнений', 'billing'),
  (gen_random_uuid(), 'billing:view', 'Просмотр тарифов и оплаты', 'Просмотр тарифов, дополнений и счетов', 'billing'),
  (gen_random_uuid(), 'blog:create', 'Создание статей', 'Создание новых статей блога', 'blog'),
  (gen_random_uuid(), 'blog:delete', 'Удаление статей', 'Удаление статей блога', 'blog'),
  (gen_random_uuid(), 'blog:publish', 'Публикация статей', 'Публикация и снятие статей с публикации', 'blog'),
  (gen_random_uuid(), 'blog:read', 'Просмотр статей', 'Просмотр статей блога организации', 'blog'),
  (gen_random_uuid(), 'blog:submit', 'Отправка на модерацию', 'Отправка статей на модерацию супер-админу', 'blog'),
  (gen_random_uuid(), 'blog:update', 'Редактирование статей', 'Изменение существующих статей', 'blog'),
  (gen_random_uuid(), 'boards:archive', 'Архивирование досок', 'Архивирование досок задач', 'boards'),
  (gen_random_uuid(), 'boards:create', 'Создание досок', 'Создание новых досок задач', 'boards'),
  (gen_random_uuid(), 'boards:delete', 'Удаление досок', 'Удаление досок задач', 'boards'),
  (gen_random_uuid(), 'boards:read', 'Просмотр досок', 'Просмотр досок задач', 'boards'),
  (gen_random_uuid(), 'boards:update', 'Редактирование досок', 'Изменение настроек досок', 'boards'),
  (gen_random_uuid(), 'artifact_recipients:manage', 'Управление получателями артефактов', 'Создание и редактирование получателей сертификатов и бейджей', 'certificates'),
  (gen_random_uuid(), 'certificates:export', 'Экспорт сертификатов', 'Скачивание и экспорт сертификатов и бейджей', 'certificates'),
  (gen_random_uuid(), 'certificates:generate', 'Генерация сертификатов', 'Создание сертификатов для участников', 'certificates'),
  (gen_random_uuid(), 'certificates:read', 'Просмотр сертификатов', 'Просмотр выданных сертификатов', 'certificates'),
  (gen_random_uuid(), 'recipient_roles:manage', 'Управление ролями получателей', 'Создание и редактирование ролей получателей события', 'certificates'),
  (gen_random_uuid(), 'checklists:create', 'Создание чеклистов', 'Создание чеклистов в задачах', 'checklists'),
  (gen_random_uuid(), 'checklists:delete', 'Удаление чеклистов', 'Удаление чеклистов из задач', 'checklists'),
  (gen_random_uuid(), 'checklists:read', 'Просмотр чеклистов', 'Просмотр чеклистов в задачах', 'checklists'),
  (gen_random_uuid(), 'checklists:update', 'Редактирование чеклистов', 'Изменение чеклистов и пунктов', 'checklists'),
  (gen_random_uuid(), 'columns:create', 'Создание колонок', 'Создание колонок на досках', 'columns'),
  (gen_random_uuid(), 'columns:delete', 'Удаление колонок', 'Удаление колонок с досок', 'columns'),
  (gen_random_uuid(), 'columns:read', 'Просмотр колонок', 'Просмотр колонок на досках', 'columns'),
  (gen_random_uuid(), 'columns:update', 'Редактирование колонок', 'Изменение колонок и их порядка', 'columns'),
  (gen_random_uuid(), 'comments:create', 'Добавление комментариев', 'Добавление комментариев к задачам', 'comments'),
  (gen_random_uuid(), 'comments:delete', 'Удаление комментариев', 'Удаление комментариев', 'comments'),
  (gen_random_uuid(), 'comments:read', 'Просмотр комментариев', 'Просмотр комментариев к задачам', 'comments'),
  (gen_random_uuid(), 'comments:update', 'Редактирование комментариев', 'Редактирование своих комментариев', 'comments'),
  (gen_random_uuid(), 'contacts:read', 'Просмотр заявок', 'Просмотр заявок на связь с организацией', 'contacts'),
  (gen_random_uuid(), 'contacts:update', 'Обработка заявок', 'Изменение статусов заявок на связь', 'contacts'),
  (gen_random_uuid(), 'dashboard:view', 'Просмотр панели', 'Доступ к главной панели организатора', 'dashboard'),
  (gen_random_uuid(), 'events:create', 'Создание событий', 'Создание новых мероприятий', 'events'),
  (gen_random_uuid(), 'events:delete', 'Удаление событий', 'Удаление мероприятий', 'events'),
  (gen_random_uuid(), 'events:publish', 'Публикация событий', 'Публикация и отмена мероприятий', 'events'),
  (gen_random_uuid(), 'events:read', 'Просмотр событий', 'Просмотр списка и деталей мероприятий', 'events'),
  (gen_random_uuid(), 'events:update', 'Редактирование событий', 'Изменение существующих мероприятий', 'events'),
  (gen_random_uuid(), 'followers:export', 'Экспорт подписчиков', 'Экспорт списка подписчиков организации', 'followers'),
  (gen_random_uuid(), 'followers:read', 'Просмотр подписчиков', 'Просмотр списка подписчиков организации', 'followers'),
  (gen_random_uuid(), 'mail:send', 'Отправка рассылок', 'Отправка писем участникам событий', 'mail'),
  (gen_random_uuid(), 'members:create', 'Добавление сотрудников', 'Создание новых сотрудников организации', 'members'),
  (gen_random_uuid(), 'members:delete', 'Удаление сотрудников', 'Удаление сотрудников из организации', 'members'),
  (gen_random_uuid(), 'members:invite', 'Приглашение сотрудников', 'Повторная отправка приглашений', 'members'),
  (gen_random_uuid(), 'members:read', 'Просмотр сотрудников', 'Просмотр списка сотрудников организации', 'members'),
  (gen_random_uuid(), 'members:update', 'Редактирование сотрудников', 'Изменение данных сотрудников', 'members'),
  (gen_random_uuid(), 'organization:delete', 'Удаление организации', 'Полное удаление организации', 'organization'),
  (gen_random_uuid(), 'organization:update', 'Редактирование организации', 'Изменение данных организации', 'organization'),
  (gen_random_uuid(), 'places:create', 'Создание площадок', 'Создание карточек площадок для аренды', 'places'),
  (gen_random_uuid(), 'places:delete', 'Удаление площадок', 'Удаление карточек площадок', 'places'),
  (gen_random_uuid(), 'places:publish', 'Публикация площадок', 'Публикация и снятие с публикации площадок', 'places'),
  (gen_random_uuid(), 'places:read', 'Просмотр площадок', 'Просмотр собственных и доступных площадок', 'places'),
  (gen_random_uuid(), 'places:request', 'Подача заявок на площадки', 'Отправка заявок на аренду площадок', 'places'),
  (gen_random_uuid(), 'places:update', 'Редактирование площадок', 'Изменение карточек площадок', 'places'),
  (gen_random_uuid(), 'questions:create', 'Добавление вопросов', 'Добавление вопросов регистрации', 'questions'),
  (gen_random_uuid(), 'questions:delete', 'Удаление вопросов', 'Удаление вопросов регистрации', 'questions'),
  (gen_random_uuid(), 'questions:read', 'Просмотр вопросов', 'Просмотр вопросов регистрации', 'questions'),
  (gen_random_uuid(), 'questions:update', 'Редактирование вопросов', 'Изменение вопросов регистрации', 'questions'),
  (gen_random_uuid(), 'registrations:approve', 'Одобрение регистраций', 'Одобрение заявок на участие', 'registrations'),
  (gen_random_uuid(), 'registrations:export', 'Экспорт регистраций', 'Экспорт списка регистраций', 'registrations'),
  (gen_random_uuid(), 'registrations:read', 'Просмотр регистраций', 'Просмотр списка регистраций участников', 'registrations'),
  (gen_random_uuid(), 'registrations:reject', 'Отклонение регистраций', 'Отклонение заявок на участие', 'registrations'),
  (gen_random_uuid(), 'roles:create', 'Создание ролей', 'Создание новых ролей', 'roles'),
  (gen_random_uuid(), 'roles:delete', 'Удаление ролей', 'Удаление ролей', 'roles'),
  (gen_random_uuid(), 'roles:manage', 'Полное управление ролями', 'Полный доступ к управлению ролями', 'roles'),
  (gen_random_uuid(), 'roles:read', 'Просмотр ролей', 'Просмотр списка ролей', 'roles'),
  (gen_random_uuid(), 'roles:update', 'Редактирование ролей', 'Изменение настроек ролей', 'roles'),
  (gen_random_uuid(), 'settings:manage', 'Управление настройками', 'Изменение настроек организации', 'settings'),
  (gen_random_uuid(), 'settings:view', 'Просмотр настроек', 'Просмотр настроек организации', 'settings'),
  (gen_random_uuid(), 'speakers:create', 'Добавление спикеров', 'Добавление спикеров к событиям', 'speakers'),
  (gen_random_uuid(), 'speakers:delete', 'Удаление спикеров', 'Удаление спикеров из события', 'speakers'),
  (gen_random_uuid(), 'speakers:read', 'Просмотр спикеров', 'Просмотр списка спикеров события', 'speakers'),
  (gen_random_uuid(), 'speakers:update', 'Редактирование спикеров', 'Изменение информации о спикерах', 'speakers'),
  (gen_random_uuid(), 'tags:create', 'Создание тегов', 'Создание тегов для досок', 'tags'),
  (gen_random_uuid(), 'tags:delete', 'Удаление тегов', 'Удаление тегов с досок', 'tags'),
  (gen_random_uuid(), 'tags:read', 'Просмотр тегов', 'Просмотр тегов досок', 'tags'),
  (gen_random_uuid(), 'tags:update', 'Редактирование тегов', 'Изменение тегов', 'tags'),
  (gen_random_uuid(), 'tasks:assign', 'Назначение исполнителей', 'Назначение исполнителей на задачи', 'tasks'),
  (gen_random_uuid(), 'tasks:create', 'Создание задач', 'Создание новых задач', 'tasks'),
  (gen_random_uuid(), 'tasks:delete', 'Удаление задач', 'Удаление задач', 'tasks'),
  (gen_random_uuid(), 'tasks:move', 'Перемещение задач', 'Перемещение задач между колонками', 'tasks'),
  (gen_random_uuid(), 'tasks:read', 'Просмотр задач', 'Просмотр задач и их деталей', 'tasks'),
  (gen_random_uuid(), 'tasks:update', 'Редактирование задач', 'Изменение задач', 'tasks'),
  (gen_random_uuid(), 'tickets:create', 'Создание билетов', 'Создание типов билетов', 'tickets'),
  (gen_random_uuid(), 'tickets:delete', 'Удаление билетов', 'Удаление типов билетов', 'tickets'),
  (gen_random_uuid(), 'tickets:read', 'Просмотр билетов', 'Просмотр информации о билетах', 'tickets'),
  (gen_random_uuid(), 'tickets:update', 'Редактирование билетов', 'Изменение типов билетов', 'tickets'),
  (gen_random_uuid(), 'uploads:create', 'Загрузка файлов', 'Загрузка файлов в систему', 'uploads'),
  (gen_random_uuid(), 'uploads:delete', 'Удаление файлов', 'Удаление загруженных файлов', 'uploads')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category";

-- 2) Backfill default-role grants for existing roles (by name).
-- Владелец → все права
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "organization_roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'Владелец'
ON CONFLICT DO NOTHING;

-- Администратор → все, кроме organization:delete
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "organization_roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'Администратор' AND p."code" <> 'organization:delete'
ON CONFLICT DO NOTHING;

-- Менеджер событий
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "organization_roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'Менеджер событий' AND p."code" IN ('agenda:create', 'agenda:delete', 'agenda:read', 'agenda:update', 'analytics:view', 'artifact_recipients:manage', 'attachments:create', 'attachments:delete', 'attachments:read', 'attendance:checkin', 'attendance:export', 'attendance:read', 'boards:archive', 'boards:create', 'boards:read', 'boards:update', 'certificates:export', 'certificates:generate', 'certificates:read', 'checklists:create', 'checklists:delete', 'checklists:read', 'checklists:update', 'columns:create', 'columns:delete', 'columns:read', 'columns:update', 'comments:create', 'comments:delete', 'comments:read', 'comments:update', 'dashboard:view', 'events:create', 'events:delete', 'events:publish', 'events:read', 'events:update', 'mail:send', 'places:create', 'places:delete', 'places:publish', 'places:read', 'places:request', 'places:update', 'questions:create', 'questions:delete', 'questions:read', 'questions:update', 'recipient_roles:manage', 'registrations:approve', 'registrations:export', 'registrations:read', 'registrations:reject', 'speakers:create', 'speakers:delete', 'speakers:read', 'speakers:update', 'tags:create', 'tags:delete', 'tags:read', 'tags:update', 'tasks:assign', 'tasks:create', 'tasks:delete', 'tasks:move', 'tasks:read', 'tasks:update', 'tickets:create', 'tickets:delete', 'tickets:read', 'tickets:update', 'uploads:create')
ON CONFLICT DO NOTHING;

-- Координатор событий
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "organization_roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'Координатор событий' AND p."code" IN ('agenda:read', 'agenda:update', 'attachments:read', 'attendance:checkin', 'attendance:read', 'boards:read', 'certificates:export', 'certificates:read', 'checklists:create', 'checklists:read', 'checklists:update', 'columns:read', 'comments:create', 'comments:read', 'comments:update', 'dashboard:view', 'events:read', 'events:update', 'questions:read', 'registrations:approve', 'registrations:read', 'registrations:reject', 'speakers:read', 'speakers:update', 'tags:read', 'tasks:create', 'tasks:move', 'tasks:read', 'tasks:update', 'tickets:read', 'tickets:update')
ON CONFLICT DO NOTHING;

-- Техподдержка
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "organization_roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'Техподдержка' AND p."code" IN ('agenda:read', 'attachments:read', 'attendance:read', 'boards:read', 'certificates:read', 'checklists:read', 'columns:read', 'comments:read', 'dashboard:view', 'events:read', 'members:read', 'questions:read', 'registrations:read', 'speakers:read', 'tags:read', 'tasks:read', 'tickets:read')
ON CONFLICT DO NOTHING;

-- Наблюдатель
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "organization_roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'Наблюдатель' AND p."code" IN ('agenda:read', 'analytics:view', 'attendance:read', 'boards:read', 'certificates:read', 'columns:read', 'comments:read', 'dashboard:view', 'events:read', 'members:read', 'registrations:read', 'speakers:read', 'tags:read', 'tasks:read', 'tickets:read')
ON CONFLICT DO NOTHING;


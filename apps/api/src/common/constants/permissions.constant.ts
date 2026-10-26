/**
 * Все доступные права в системе
 */
export const PERMISSIONS = {
  // ==================== ПАНЕЛЬ ====================
  DASHBOARD_VIEW: 'dashboard:view',

  // ==================== СОБЫТИЯ ====================
  EVENTS_CREATE: 'events:create',
  EVENTS_READ: 'events:read',
  EVENTS_UPDATE: 'events:update',
  EVENTS_DELETE: 'events:delete',
  EVENTS_PUBLISH: 'events:publish',

  // Площадки для аренды
  PLACES_CREATE: 'places:create',
  PLACES_READ: 'places:read',
  PLACES_UPDATE: 'places:update',
  PLACES_DELETE: 'places:delete',
  PLACES_PUBLISH: 'places:publish',
  PLACES_REQUEST: 'places:request',

  // Спикеры события
  SPEAKERS_CREATE: 'speakers:create',
  SPEAKERS_READ: 'speakers:read',
  SPEAKERS_UPDATE: 'speakers:update',
  SPEAKERS_DELETE: 'speakers:delete',

  // Программа события
  AGENDA_CREATE: 'agenda:create',
  AGENDA_READ: 'agenda:read',
  AGENDA_UPDATE: 'agenda:update',
  AGENDA_DELETE: 'agenda:delete',

  // Вопросы регистрации
  QUESTIONS_CREATE: 'questions:create',
  QUESTIONS_READ: 'questions:read',
  QUESTIONS_UPDATE: 'questions:update',
  QUESTIONS_DELETE: 'questions:delete',

  // ==================== РЕГИСТРАЦИИ ====================
  REGISTRATIONS_READ: 'registrations:read',
  REGISTRATIONS_APPROVE: 'registrations:approve',
  REGISTRATIONS_REJECT: 'registrations:reject',
  REGISTRATIONS_EXPORT: 'registrations:export',

  // ==================== ПОСЕЩАЕМОСТЬ ====================
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_CHECKIN: 'attendance:checkin',
  ATTENDANCE_EXPORT: 'attendance:export',

  // ==================== БИЛЕТЫ ====================
  TICKETS_CREATE: 'tickets:create',
  TICKETS_READ: 'tickets:read',
  TICKETS_UPDATE: 'tickets:update',
  TICKETS_DELETE: 'tickets:delete',

  // ==================== СЕРТИФИКАТЫ ====================
  CERTIFICATES_GENERATE: 'certificates:generate',
  CERTIFICATES_READ: 'certificates:read',
  CERTIFICATES_EXPORT: 'certificates:export',
  ARTIFACT_RECIPIENTS_MANAGE: 'artifact_recipients:manage',
  RECIPIENT_ROLES_MANAGE: 'recipient_roles:manage',

  // ==================== РАССЫЛКИ ====================
  MAIL_SEND: 'mail:send',

  // ==================== ДОСКИ ЗАДАЧ ====================
  BOARDS_CREATE: 'boards:create',
  BOARDS_READ: 'boards:read',
  BOARDS_UPDATE: 'boards:update',
  BOARDS_DELETE: 'boards:delete',
  BOARDS_ARCHIVE: 'boards:archive',

  // Колонки досок
  COLUMNS_CREATE: 'columns:create',
  COLUMNS_READ: 'columns:read',
  COLUMNS_UPDATE: 'columns:update',
  COLUMNS_DELETE: 'columns:delete',

  // Задачи
  TASKS_CREATE: 'tasks:create',
  TASKS_READ: 'tasks:read',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',
  TASKS_ASSIGN: 'tasks:assign',
  TASKS_MOVE: 'tasks:move',

  // Комментарии к задачам
  COMMENTS_CREATE: 'comments:create',
  COMMENTS_READ: 'comments:read',
  COMMENTS_UPDATE: 'comments:update',
  COMMENTS_DELETE: 'comments:delete',

  // Чеклисты
  CHECKLISTS_CREATE: 'checklists:create',
  CHECKLISTS_READ: 'checklists:read',
  CHECKLISTS_UPDATE: 'checklists:update',
  CHECKLISTS_DELETE: 'checklists:delete',

  // Теги досок
  TAGS_CREATE: 'tags:create',
  TAGS_READ: 'tags:read',
  TAGS_UPDATE: 'tags:update',
  TAGS_DELETE: 'tags:delete',

  // Вложения
  ATTACHMENTS_CREATE: 'attachments:create',
  ATTACHMENTS_READ: 'attachments:read',
  ATTACHMENTS_DELETE: 'attachments:delete',

  // ==================== ЧЛЕНЫ ОРГАНИЗАЦИИ ====================
  MEMBERS_CREATE: 'members:create',
  MEMBERS_READ: 'members:read',
  MEMBERS_UPDATE: 'members:update',
  MEMBERS_DELETE: 'members:delete',
  MEMBERS_INVITE: 'members:invite',

  // ==================== ПОДПИСЧИКИ ====================
  FOLLOWERS_READ: 'followers:read',
  FOLLOWERS_EXPORT: 'followers:export',

  // ==================== ЗАЯВКИ ====================
  CONTACTS_READ: 'contacts:read',
  CONTACTS_UPDATE: 'contacts:update',

  // ==================== РОЛИ ====================
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_MANAGE: 'roles:manage', // Полное управление ролями

  // ==================== НАСТРОЙКИ ОРГАНИЗАЦИИ ====================
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',

  // ==================== ОРГАНИЗАЦИЯ ====================
  ORGANIZATION_UPDATE: 'organization:update',
  ORGANIZATION_DELETE: 'organization:delete',

  // ==================== АНАЛИТИКА ====================
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',

  // ==================== ТАРИФЫ И ОПЛАТА ====================
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',

  // ==================== ЗАГРУЗКИ ====================
  UPLOADS_CREATE: 'uploads:create',
  UPLOADS_DELETE: 'uploads:delete',

  // ==================== БЛОГ ====================
  BLOG_CREATE: 'blog:create',
  BLOG_READ: 'blog:read',
  BLOG_UPDATE: 'blog:update',
  BLOG_DELETE: 'blog:delete',
  BLOG_PUBLISH: 'blog:publish',
  BLOG_SUBMIT: 'blog:submit',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Категории прав для группировки в UI
 */
export const PERMISSION_CATEGORIES = {
  DASHBOARD: 'dashboard',
  EVENTS: 'events',
  PLACES: 'places',
  SPEAKERS: 'speakers',
  AGENDA: 'agenda',
  QUESTIONS: 'questions',
  REGISTRATIONS: 'registrations',
  ATTENDANCE: 'attendance',
  TICKETS: 'tickets',
  CERTIFICATES: 'certificates',
  MAIL: 'mail',
  BOARDS: 'boards',
  COLUMNS: 'columns',
  TASKS: 'tasks',
  COMMENTS: 'comments',
  CHECKLISTS: 'checklists',
  TAGS: 'tags',
  ATTACHMENTS: 'attachments',
  MEMBERS: 'members',
  FOLLOWERS: 'followers',
  CONTACTS: 'contacts',
  ROLES: 'roles',
  SETTINGS: 'settings',
  ORGANIZATION: 'organization',
  ANALYTICS: 'analytics',
  BILLING: 'billing',
  UPLOADS: 'uploads',
  BLOG: 'blog',
} as const;

/**
 * Предустановленные роли с их правами
 */
export const DEFAULT_ROLES = {
  OWNER: {
    name: 'Владелец',
    permissions: Object.values(PERMISSIONS),
  },
  ADMIN: {
    name: 'Администратор',
    permissions: Object.values(PERMISSIONS).filter(
      (p) => p !== PERMISSIONS.ORGANIZATION_DELETE,
    ),
  },
  EVENT_MANAGER: {
    name: 'Менеджер событий',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      // События
      PERMISSIONS.EVENTS_CREATE,
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.EVENTS_UPDATE,
      PERMISSIONS.EVENTS_DELETE,
      PERMISSIONS.EVENTS_PUBLISH,
      // Площадки
      PERMISSIONS.PLACES_CREATE,
      PERMISSIONS.PLACES_READ,
      PERMISSIONS.PLACES_UPDATE,
      PERMISSIONS.PLACES_DELETE,
      PERMISSIONS.PLACES_PUBLISH,
      PERMISSIONS.PLACES_REQUEST,
      // Спикеры
      PERMISSIONS.SPEAKERS_CREATE,
      PERMISSIONS.SPEAKERS_READ,
      PERMISSIONS.SPEAKERS_UPDATE,
      PERMISSIONS.SPEAKERS_DELETE,
      // Программа
      PERMISSIONS.AGENDA_CREATE,
      PERMISSIONS.AGENDA_READ,
      PERMISSIONS.AGENDA_UPDATE,
      PERMISSIONS.AGENDA_DELETE,
      // Вопросы
      PERMISSIONS.QUESTIONS_CREATE,
      PERMISSIONS.QUESTIONS_READ,
      PERMISSIONS.QUESTIONS_UPDATE,
      PERMISSIONS.QUESTIONS_DELETE,
      // Билеты
      PERMISSIONS.TICKETS_CREATE,
      PERMISSIONS.TICKETS_READ,
      PERMISSIONS.TICKETS_UPDATE,
      PERMISSIONS.TICKETS_DELETE,
      // Регистрации
      PERMISSIONS.REGISTRATIONS_READ,
      PERMISSIONS.REGISTRATIONS_APPROVE,
      PERMISSIONS.REGISTRATIONS_REJECT,
      PERMISSIONS.REGISTRATIONS_EXPORT,
      // Посещаемость
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.ATTENDANCE_CHECKIN,
      PERMISSIONS.ATTENDANCE_EXPORT,
      // Сертификаты
      PERMISSIONS.CERTIFICATES_GENERATE,
      PERMISSIONS.CERTIFICATES_READ,
      PERMISSIONS.CERTIFICATES_EXPORT,
      PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE,
      PERMISSIONS.RECIPIENT_ROLES_MANAGE,
      // Рассылки
      PERMISSIONS.MAIL_SEND,
      // Аналитика
      PERMISSIONS.ANALYTICS_VIEW,
      // Доски
      PERMISSIONS.BOARDS_CREATE,
      PERMISSIONS.BOARDS_READ,
      PERMISSIONS.BOARDS_UPDATE,
      PERMISSIONS.BOARDS_ARCHIVE,
      // Колонки
      PERMISSIONS.COLUMNS_CREATE,
      PERMISSIONS.COLUMNS_READ,
      PERMISSIONS.COLUMNS_UPDATE,
      PERMISSIONS.COLUMNS_DELETE,
      // Задачи
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.TASKS_UPDATE,
      PERMISSIONS.TASKS_DELETE,
      PERMISSIONS.TASKS_ASSIGN,
      PERMISSIONS.TASKS_MOVE,
      // Комментарии
      PERMISSIONS.COMMENTS_CREATE,
      PERMISSIONS.COMMENTS_READ,
      PERMISSIONS.COMMENTS_UPDATE,
      PERMISSIONS.COMMENTS_DELETE,
      // Чеклисты
      PERMISSIONS.CHECKLISTS_CREATE,
      PERMISSIONS.CHECKLISTS_READ,
      PERMISSIONS.CHECKLISTS_UPDATE,
      PERMISSIONS.CHECKLISTS_DELETE,
      // Теги
      PERMISSIONS.TAGS_CREATE,
      PERMISSIONS.TAGS_READ,
      PERMISSIONS.TAGS_UPDATE,
      PERMISSIONS.TAGS_DELETE,
      // Вложения
      PERMISSIONS.ATTACHMENTS_CREATE,
      PERMISSIONS.ATTACHMENTS_READ,
      PERMISSIONS.ATTACHMENTS_DELETE,
      // Загрузки
      PERMISSIONS.UPLOADS_CREATE,
    ],
  },
  EVENT_COORDINATOR: {
    name: 'Координатор событий',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      // События (только просмотр и редактирование)
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.EVENTS_UPDATE,
      // Спикеры
      PERMISSIONS.SPEAKERS_READ,
      PERMISSIONS.SPEAKERS_UPDATE,
      // Программа
      PERMISSIONS.AGENDA_READ,
      PERMISSIONS.AGENDA_UPDATE,
      // Вопросы
      PERMISSIONS.QUESTIONS_READ,
      // Билеты
      PERMISSIONS.TICKETS_READ,
      PERMISSIONS.TICKETS_UPDATE,
      // Регистрации
      PERMISSIONS.REGISTRATIONS_READ,
      PERMISSIONS.REGISTRATIONS_APPROVE,
      PERMISSIONS.REGISTRATIONS_REJECT,
      // Посещаемость
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.ATTENDANCE_CHECKIN,
      // Сертификаты
      PERMISSIONS.CERTIFICATES_READ,
      PERMISSIONS.CERTIFICATES_EXPORT,
      // Доски
      PERMISSIONS.BOARDS_READ,
      PERMISSIONS.COLUMNS_READ,
      // Задачи
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.TASKS_UPDATE,
      PERMISSIONS.TASKS_MOVE,
      // Комментарии
      PERMISSIONS.COMMENTS_CREATE,
      PERMISSIONS.COMMENTS_READ,
      PERMISSIONS.COMMENTS_UPDATE,
      // Чеклисты
      PERMISSIONS.CHECKLISTS_CREATE,
      PERMISSIONS.CHECKLISTS_READ,
      PERMISSIONS.CHECKLISTS_UPDATE,
      // Теги
      PERMISSIONS.TAGS_READ,
      // Вложения
      PERMISSIONS.ATTACHMENTS_READ,
    ],
  },
  SUPPORT: {
    name: 'Техподдержка',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.SPEAKERS_READ,
      PERMISSIONS.AGENDA_READ,
      PERMISSIONS.QUESTIONS_READ,
      PERMISSIONS.MEMBERS_READ,
      PERMISSIONS.TICKETS_READ,
      PERMISSIONS.REGISTRATIONS_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.CERTIFICATES_READ,
      PERMISSIONS.BOARDS_READ,
      PERMISSIONS.COLUMNS_READ,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.COMMENTS_READ,
      PERMISSIONS.CHECKLISTS_READ,
      PERMISSIONS.TAGS_READ,
      PERMISSIONS.ATTACHMENTS_READ,
    ],
  },
  OBSERVER: {
    name: 'Наблюдатель',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.SPEAKERS_READ,
      PERMISSIONS.AGENDA_READ,
      PERMISSIONS.MEMBERS_READ,
      PERMISSIONS.TICKETS_READ,
      PERMISSIONS.REGISTRATIONS_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.CERTIFICATES_READ,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.BOARDS_READ,
      PERMISSIONS.COLUMNS_READ,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.COMMENTS_READ,
      PERMISSIONS.TAGS_READ,
    ],
  },
} as const;

/**
 * Полный список прав с описаниями для seed
 */
export const PERMISSIONS_LIST = [
  // ==================== ПАНЕЛЬ ====================
  {
    code: PERMISSIONS.DASHBOARD_VIEW,
    name: 'Просмотр панели',
    category: PERMISSION_CATEGORIES.DASHBOARD,
    description: 'Доступ к главной панели организатора',
  },

  // ==================== СОБЫТИЯ ====================
  {
    code: PERMISSIONS.EVENTS_CREATE,
    name: 'Создание событий',
    category: PERMISSION_CATEGORIES.EVENTS,
    description: 'Создание новых мероприятий',
  },
  {
    code: PERMISSIONS.EVENTS_READ,
    name: 'Просмотр событий',
    category: PERMISSION_CATEGORIES.EVENTS,
    description: 'Просмотр списка и деталей мероприятий',
  },
  {
    code: PERMISSIONS.EVENTS_UPDATE,
    name: 'Редактирование событий',
    category: PERMISSION_CATEGORIES.EVENTS,
    description: 'Изменение существующих мероприятий',
  },
  {
    code: PERMISSIONS.EVENTS_DELETE,
    name: 'Удаление событий',
    category: PERMISSION_CATEGORIES.EVENTS,
    description: 'Удаление мероприятий',
  },
  {
    code: PERMISSIONS.EVENTS_PUBLISH,
    name: 'Публикация событий',
    category: PERMISSION_CATEGORIES.EVENTS,
    description: 'Публикация и отмена мероприятий',
  },

  // ==================== СПИКЕРЫ ====================
  {
    code: PERMISSIONS.SPEAKERS_CREATE,
    name: 'Добавление спикеров',
    category: PERMISSION_CATEGORIES.SPEAKERS,
    description: 'Добавление спикеров к событиям',
  },
  {
    code: PERMISSIONS.SPEAKERS_READ,
    name: 'Просмотр спикеров',
    category: PERMISSION_CATEGORIES.SPEAKERS,
    description: 'Просмотр списка спикеров события',
  },
  {
    code: PERMISSIONS.SPEAKERS_UPDATE,
    name: 'Редактирование спикеров',
    category: PERMISSION_CATEGORIES.SPEAKERS,
    description: 'Изменение информации о спикерах',
  },
  {
    code: PERMISSIONS.SPEAKERS_DELETE,
    name: 'Удаление спикеров',
    category: PERMISSION_CATEGORIES.SPEAKERS,
    description: 'Удаление спикеров из события',
  },

  // ==================== ПРОГРАММА ====================
  {
    code: PERMISSIONS.AGENDA_CREATE,
    name: 'Добавление пунктов программы',
    category: PERMISSION_CATEGORIES.AGENDA,
    description: 'Добавление пунктов в программу события',
  },
  {
    code: PERMISSIONS.AGENDA_READ,
    name: 'Просмотр программы',
    category: PERMISSION_CATEGORIES.AGENDA,
    description: 'Просмотр программы события',
  },
  {
    code: PERMISSIONS.AGENDA_UPDATE,
    name: 'Редактирование программы',
    category: PERMISSION_CATEGORIES.AGENDA,
    description: 'Изменение программы события',
  },
  {
    code: PERMISSIONS.AGENDA_DELETE,
    name: 'Удаление пунктов программы',
    category: PERMISSION_CATEGORIES.AGENDA,
    description: 'Удаление пунктов из программы',
  },

  // ==================== ВОПРОСЫ РЕГИСТРАЦИИ ====================
  {
    code: PERMISSIONS.QUESTIONS_CREATE,
    name: 'Добавление вопросов',
    category: PERMISSION_CATEGORIES.QUESTIONS,
    description: 'Добавление вопросов регистрации',
  },
  {
    code: PERMISSIONS.QUESTIONS_READ,
    name: 'Просмотр вопросов',
    category: PERMISSION_CATEGORIES.QUESTIONS,
    description: 'Просмотр вопросов регистрации',
  },
  {
    code: PERMISSIONS.QUESTIONS_UPDATE,
    name: 'Редактирование вопросов',
    category: PERMISSION_CATEGORIES.QUESTIONS,
    description: 'Изменение вопросов регистрации',
  },
  {
    code: PERMISSIONS.QUESTIONS_DELETE,
    name: 'Удаление вопросов',
    category: PERMISSION_CATEGORIES.QUESTIONS,
    description: 'Удаление вопросов регистрации',
  },

  // ==================== РЕГИСТРАЦИИ ====================
  {
    code: PERMISSIONS.REGISTRATIONS_READ,
    name: 'Просмотр регистраций',
    category: PERMISSION_CATEGORIES.REGISTRATIONS,
    description: 'Просмотр списка регистраций участников',
  },
  {
    code: PERMISSIONS.REGISTRATIONS_APPROVE,
    name: 'Одобрение регистраций',
    category: PERMISSION_CATEGORIES.REGISTRATIONS,
    description: 'Одобрение заявок на участие',
  },
  {
    code: PERMISSIONS.REGISTRATIONS_REJECT,
    name: 'Отклонение регистраций',
    category: PERMISSION_CATEGORIES.REGISTRATIONS,
    description: 'Отклонение заявок на участие',
  },
  {
    code: PERMISSIONS.REGISTRATIONS_EXPORT,
    name: 'Экспорт регистраций',
    category: PERMISSION_CATEGORIES.REGISTRATIONS,
    description: 'Экспорт списка регистраций',
  },

  // ==================== ПОСЕЩАЕМОСТЬ ====================
  {
    code: PERMISSIONS.ATTENDANCE_READ,
    name: 'Просмотр посещаемости',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
    description: 'Просмотр отчётов посещаемости',
  },
  {
    code: PERMISSIONS.ATTENDANCE_CHECKIN,
    name: 'Отметка посещения',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
    description: 'Отметка посещения (check-in)',
  },
  {
    code: PERMISSIONS.ATTENDANCE_EXPORT,
    name: 'Экспорт посещаемости',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
    description: 'Экспорт отчётов посещаемости',
  },

  // ==================== БИЛЕТЫ ====================
  {
    code: PERMISSIONS.TICKETS_CREATE,
    name: 'Создание билетов',
    category: PERMISSION_CATEGORIES.TICKETS,
    description: 'Создание типов билетов',
  },
  {
    code: PERMISSIONS.TICKETS_READ,
    name: 'Просмотр билетов',
    category: PERMISSION_CATEGORIES.TICKETS,
    description: 'Просмотр информации о билетах',
  },
  {
    code: PERMISSIONS.TICKETS_UPDATE,
    name: 'Редактирование билетов',
    category: PERMISSION_CATEGORIES.TICKETS,
    description: 'Изменение типов билетов',
  },
  {
    code: PERMISSIONS.TICKETS_DELETE,
    name: 'Удаление билетов',
    category: PERMISSION_CATEGORIES.TICKETS,
    description: 'Удаление типов билетов',
  },

  // ==================== СЕРТИФИКАТЫ ====================
  {
    code: PERMISSIONS.CERTIFICATES_GENERATE,
    name: 'Генерация сертификатов',
    category: PERMISSION_CATEGORIES.CERTIFICATES,
    description: 'Создание сертификатов для участников',
  },
  {
    code: PERMISSIONS.CERTIFICATES_READ,
    name: 'Просмотр сертификатов',
    category: PERMISSION_CATEGORIES.CERTIFICATES,
    description: 'Просмотр выданных сертификатов',
  },
  {
    code: PERMISSIONS.CERTIFICATES_EXPORT,
    name: 'Экспорт сертификатов и бейджей',
    category: PERMISSION_CATEGORIES.CERTIFICATES,
    description: 'Скачивание сертификатов и ZIP-архивов бейджей',
  },
  {
    code: PERMISSIONS.ARTIFACT_RECIPIENTS_MANAGE,
    name: 'Управление получателями артефактов',
    category: PERMISSION_CATEGORIES.CERTIFICATES,
    description: 'Создание и редактирование получателей сертификатов и бейджей',
  },
  {
    code: PERMISSIONS.RECIPIENT_ROLES_MANAGE,
    name: 'Управление ролями получателей',
    category: PERMISSION_CATEGORIES.CERTIFICATES,
    description: 'Создание и редактирование ролей получателей события',
  },

  // ==================== РАССЫЛКИ ====================
  {
    code: PERMISSIONS.MAIL_SEND,
    name: 'Отправка рассылок',
    category: PERMISSION_CATEGORIES.MAIL,
    description: 'Отправка писем участникам событий',
  },

  // ==================== ДОСКИ ЗАДАЧ ====================
  {
    code: PERMISSIONS.BOARDS_CREATE,
    name: 'Создание досок',
    category: PERMISSION_CATEGORIES.BOARDS,
    description: 'Создание новых досок задач',
  },
  {
    code: PERMISSIONS.BOARDS_READ,
    name: 'Просмотр досок',
    category: PERMISSION_CATEGORIES.BOARDS,
    description: 'Просмотр досок задач',
  },
  {
    code: PERMISSIONS.BOARDS_UPDATE,
    name: 'Редактирование досок',
    category: PERMISSION_CATEGORIES.BOARDS,
    description: 'Изменение настроек досок',
  },
  {
    code: PERMISSIONS.BOARDS_DELETE,
    name: 'Удаление досок',
    category: PERMISSION_CATEGORIES.BOARDS,
    description: 'Удаление досок задач',
  },
  {
    code: PERMISSIONS.BOARDS_ARCHIVE,
    name: 'Архивирование досок',
    category: PERMISSION_CATEGORIES.BOARDS,
    description: 'Архивирование досок задач',
  },

  // ==================== КОЛОНКИ ====================
  {
    code: PERMISSIONS.COLUMNS_CREATE,
    name: 'Создание колонок',
    category: PERMISSION_CATEGORIES.COLUMNS,
    description: 'Создание колонок на досках',
  },
  {
    code: PERMISSIONS.COLUMNS_READ,
    name: 'Просмотр колонок',
    category: PERMISSION_CATEGORIES.COLUMNS,
    description: 'Просмотр колонок на досках',
  },
  {
    code: PERMISSIONS.COLUMNS_UPDATE,
    name: 'Редактирование колонок',
    category: PERMISSION_CATEGORIES.COLUMNS,
    description: 'Изменение колонок и их порядка',
  },
  {
    code: PERMISSIONS.COLUMNS_DELETE,
    name: 'Удаление колонок',
    category: PERMISSION_CATEGORIES.COLUMNS,
    description: 'Удаление колонок с досок',
  },

  // ==================== ЗАДАЧИ ====================
  {
    code: PERMISSIONS.TASKS_CREATE,
    name: 'Создание задач',
    category: PERMISSION_CATEGORIES.TASKS,
    description: 'Создание новых задач',
  },
  {
    code: PERMISSIONS.TASKS_READ,
    name: 'Просмотр задач',
    category: PERMISSION_CATEGORIES.TASKS,
    description: 'Просмотр задач и их деталей',
  },
  {
    code: PERMISSIONS.TASKS_UPDATE,
    name: 'Редактирование задач',
    category: PERMISSION_CATEGORIES.TASKS,
    description: 'Изменение задач',
  },
  {
    code: PERMISSIONS.TASKS_DELETE,
    name: 'Удаление задач',
    category: PERMISSION_CATEGORIES.TASKS,
    description: 'Удаление задач',
  },
  {
    code: PERMISSIONS.TASKS_ASSIGN,
    name: 'Назначение исполнителей',
    category: PERMISSION_CATEGORIES.TASKS,
    description: 'Назначение исполнителей на задачи',
  },
  {
    code: PERMISSIONS.TASKS_MOVE,
    name: 'Перемещение задач',
    category: PERMISSION_CATEGORIES.TASKS,
    description: 'Перемещение задач между колонками',
  },

  // ==================== КОММЕНТАРИИ ====================
  {
    code: PERMISSIONS.COMMENTS_CREATE,
    name: 'Добавление комментариев',
    category: PERMISSION_CATEGORIES.COMMENTS,
    description: 'Добавление комментариев к задачам',
  },
  {
    code: PERMISSIONS.COMMENTS_READ,
    name: 'Просмотр комментариев',
    category: PERMISSION_CATEGORIES.COMMENTS,
    description: 'Просмотр комментариев к задачам',
  },
  {
    code: PERMISSIONS.COMMENTS_UPDATE,
    name: 'Редактирование комментариев',
    category: PERMISSION_CATEGORIES.COMMENTS,
    description: 'Редактирование своих комментариев',
  },
  {
    code: PERMISSIONS.COMMENTS_DELETE,
    name: 'Удаление комментариев',
    category: PERMISSION_CATEGORIES.COMMENTS,
    description: 'Удаление комментариев',
  },

  // ==================== ЧЕКЛИСТЫ ====================
  {
    code: PERMISSIONS.CHECKLISTS_CREATE,
    name: 'Создание чеклистов',
    category: PERMISSION_CATEGORIES.CHECKLISTS,
    description: 'Создание чеклистов в задачах',
  },
  {
    code: PERMISSIONS.CHECKLISTS_READ,
    name: 'Просмотр чеклистов',
    category: PERMISSION_CATEGORIES.CHECKLISTS,
    description: 'Просмотр чеклистов в задачах',
  },
  {
    code: PERMISSIONS.CHECKLISTS_UPDATE,
    name: 'Редактирование чеклистов',
    category: PERMISSION_CATEGORIES.CHECKLISTS,
    description: 'Изменение чеклистов и пунктов',
  },
  {
    code: PERMISSIONS.CHECKLISTS_DELETE,
    name: 'Удаление чеклистов',
    category: PERMISSION_CATEGORIES.CHECKLISTS,
    description: 'Удаление чеклистов из задач',
  },

  // ==================== ТЕГИ ====================
  {
    code: PERMISSIONS.TAGS_CREATE,
    name: 'Создание тегов',
    category: PERMISSION_CATEGORIES.TAGS,
    description: 'Создание тегов для досок',
  },
  {
    code: PERMISSIONS.TAGS_READ,
    name: 'Просмотр тегов',
    category: PERMISSION_CATEGORIES.TAGS,
    description: 'Просмотр тегов досок',
  },
  {
    code: PERMISSIONS.TAGS_UPDATE,
    name: 'Редактирование тегов',
    category: PERMISSION_CATEGORIES.TAGS,
    description: 'Изменение тегов',
  },
  {
    code: PERMISSIONS.TAGS_DELETE,
    name: 'Удаление тегов',
    category: PERMISSION_CATEGORIES.TAGS,
    description: 'Удаление тегов с досок',
  },

  // ==================== ВЛОЖЕНИЯ ====================
  {
    code: PERMISSIONS.ATTACHMENTS_CREATE,
    name: 'Добавление вложений',
    category: PERMISSION_CATEGORIES.ATTACHMENTS,
    description: 'Прикрепление файлов к задачам',
  },
  {
    code: PERMISSIONS.ATTACHMENTS_READ,
    name: 'Просмотр вложений',
    category: PERMISSION_CATEGORIES.ATTACHMENTS,
    description: 'Просмотр и скачивание вложений',
  },
  {
    code: PERMISSIONS.ATTACHMENTS_DELETE,
    name: 'Удаление вложений',
    category: PERMISSION_CATEGORIES.ATTACHMENTS,
    description: 'Удаление вложений из задач',
  },

  // ==================== ЧЛЕНЫ ОРГАНИЗАЦИИ ====================
  {
    code: PERMISSIONS.MEMBERS_CREATE,
    name: 'Добавление сотрудников',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'Создание новых сотрудников организации',
  },
  {
    code: PERMISSIONS.MEMBERS_READ,
    name: 'Просмотр сотрудников',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'Просмотр списка сотрудников организации',
  },
  {
    code: PERMISSIONS.MEMBERS_UPDATE,
    name: 'Редактирование сотрудников',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'Изменение данных сотрудников',
  },
  {
    code: PERMISSIONS.MEMBERS_DELETE,
    name: 'Удаление сотрудников',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'Удаление сотрудников из организации',
  },
  {
    code: PERMISSIONS.MEMBERS_INVITE,
    name: 'Приглашение сотрудников',
    category: PERMISSION_CATEGORIES.MEMBERS,
    description: 'Повторная отправка приглашений',
  },

  // ==================== ПОДПИСЧИКИ ====================
  {
    code: PERMISSIONS.FOLLOWERS_READ,
    name: 'Просмотр подписчиков',
    category: PERMISSION_CATEGORIES.FOLLOWERS,
    description: 'Просмотр списка подписчиков организации',
  },
  {
    code: PERMISSIONS.FOLLOWERS_EXPORT,
    name: 'Экспорт подписчиков',
    category: PERMISSION_CATEGORIES.FOLLOWERS,
    description: 'Экспорт списка подписчиков организации',
  },

  // ==================== ЗАЯВКИ ====================
  {
    code: PERMISSIONS.CONTACTS_READ,
    name: 'Просмотр заявок',
    category: PERMISSION_CATEGORIES.CONTACTS,
    description: 'Просмотр заявок на связь с организацией',
  },
  {
    code: PERMISSIONS.CONTACTS_UPDATE,
    name: 'Обработка заявок',
    category: PERMISSION_CATEGORIES.CONTACTS,
    description: 'Изменение статусов заявок на связь',
  },

  // ==================== РОЛИ ====================
  {
    code: PERMISSIONS.ROLES_CREATE,
    name: 'Создание ролей',
    category: PERMISSION_CATEGORIES.ROLES,
    description: 'Создание новых ролей',
  },
  {
    code: PERMISSIONS.ROLES_READ,
    name: 'Просмотр ролей',
    category: PERMISSION_CATEGORIES.ROLES,
    description: 'Просмотр списка ролей',
  },
  {
    code: PERMISSIONS.ROLES_UPDATE,
    name: 'Редактирование ролей',
    category: PERMISSION_CATEGORIES.ROLES,
    description: 'Изменение настроек ролей',
  },
  {
    code: PERMISSIONS.ROLES_DELETE,
    name: 'Удаление ролей',
    category: PERMISSION_CATEGORIES.ROLES,
    description: 'Удаление ролей',
  },
  {
    code: PERMISSIONS.ROLES_MANAGE,
    name: 'Полное управление ролями',
    category: PERMISSION_CATEGORIES.ROLES,
    description:
      'Полный доступ к управлению ролями (создание, редактирование, удаление)',
  },

  // ==================== НАСТРОЙКИ ====================
  {
    code: PERMISSIONS.SETTINGS_VIEW,
    name: 'Просмотр настроек',
    category: PERMISSION_CATEGORIES.SETTINGS,
    description: 'Просмотр настроек организации',
  },
  {
    code: PERMISSIONS.SETTINGS_MANAGE,
    name: 'Управление настройками',
    category: PERMISSION_CATEGORIES.SETTINGS,
    description: 'Изменение настроек организации',
  },

  // ==================== ОРГАНИЗАЦИЯ ====================
  {
    code: PERMISSIONS.ORGANIZATION_UPDATE,
    name: 'Редактирование организации',
    category: PERMISSION_CATEGORIES.ORGANIZATION,
    description: 'Изменение данных организации',
  },
  {
    code: PERMISSIONS.ORGANIZATION_DELETE,
    name: 'Удаление организации',
    category: PERMISSION_CATEGORIES.ORGANIZATION,
    description: 'Полное удаление организации',
  },

  // ==================== АНАЛИТИКА ====================
  {
    code: PERMISSIONS.ANALYTICS_VIEW,
    name: 'Просмотр аналитики',
    category: PERMISSION_CATEGORIES.ANALYTICS,
    description: 'Доступ к аналитике и отчётам',
  },
  {
    code: PERMISSIONS.ANALYTICS_EXPORT,
    name: 'Экспорт аналитики',
    category: PERMISSION_CATEGORIES.ANALYTICS,
    description: 'Экспорт аналитических данных',
  },

  // ==================== ТАРИФЫ И ОПЛАТА ====================
  {
    code: PERMISSIONS.BILLING_VIEW,
    name: 'Просмотр тарифов и оплаты',
    category: PERMISSION_CATEGORIES.BILLING,
    description: 'Просмотр тарифов, дополнений и счетов',
  },
  {
    code: PERMISSIONS.BILLING_MANAGE,
    name: 'Управление тарифами и оплатой',
    category: PERMISSION_CATEGORIES.BILLING,
    description: 'Изменение тарифа и платных дополнений',
  },

  // ==================== ЗАГРУЗКИ ====================
  {
    code: PERMISSIONS.UPLOADS_CREATE,
    name: 'Загрузка файлов',
    category: PERMISSION_CATEGORIES.UPLOADS,
    description: 'Загрузка файлов в систему',
  },
  {
    code: PERMISSIONS.UPLOADS_DELETE,
    name: 'Удаление файлов',
    category: PERMISSION_CATEGORIES.UPLOADS,
    description: 'Удаление загруженных файлов',
  },

  // ==================== БЛОГ ====================
  {
    code: PERMISSIONS.BLOG_CREATE,
    name: 'Создание статей',
    category: PERMISSION_CATEGORIES.BLOG,
    description: 'Создание новых статей блога',
  },
  {
    code: PERMISSIONS.BLOG_READ,
    name: 'Просмотр статей',
    category: PERMISSION_CATEGORIES.BLOG,
    description: 'Просмотр статей блога организации',
  },
  {
    code: PERMISSIONS.BLOG_UPDATE,
    name: 'Редактирование статей',
    category: PERMISSION_CATEGORIES.BLOG,
    description: 'Изменение существующих статей',
  },
  {
    code: PERMISSIONS.BLOG_DELETE,
    name: 'Удаление статей',
    category: PERMISSION_CATEGORIES.BLOG,
    description: 'Удаление статей блога',
  },
  {
    code: PERMISSIONS.BLOG_PUBLISH,
    name: 'Публикация статей',
    category: PERMISSION_CATEGORIES.BLOG,
    description: 'Публикация и снятие статей с публикации',
  },
  {
    code: PERMISSIONS.BLOG_SUBMIT,
    name: 'Отправка на модерацию',
    category: PERMISSION_CATEGORIES.BLOG,
    description: 'Отправка статей на модерацию супер-админу',
  },
];

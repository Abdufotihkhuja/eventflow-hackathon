/**
 * Типы для API управления пользователями
 */
import { createLabelGetter, type Translator } from '@eventflow/i18n'

/**
 * Роли пользователей в системе управления мероприятиями
 */
export const UserRole = {
  OWNER: 'owner', // Владелец организации - полный доступ
  ADMIN: 'admin', // Администратор - полный доступ к управлению
  EVENT_MANAGER: 'event_manager', // Менеджер событий - создание/редактирование событий
  EVENT_COORDINATOR: 'event_coordinator', // Координатор событий - управление участниками
  SUPPORT: 'support', // Техническая поддержка - просмотр и помощь
  VIEWER: 'viewer', // Просмотр - только статистика
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

/**
 * Лейблы для отображения ролей
 */
export const USER_ROLE_LABEL_KEYS = {
  [UserRole.OWNER]: 'users.role.owner',
  [UserRole.ADMIN]: 'users.role.admin',
  [UserRole.EVENT_MANAGER]: 'users.role.eventManager',
  [UserRole.EVENT_COORDINATOR]: 'users.role.eventCoordinator',
  [UserRole.SUPPORT]: 'users.role.support',
  [UserRole.VIEWER]: 'users.role.viewer',
} as const satisfies Record<UserRole, string>

/**
 * Описания ролей
 */
export const USER_ROLE_DESCRIPTION_KEYS = {
  [UserRole.OWNER]: 'users.roleDescription.owner',
  [UserRole.ADMIN]: 'users.roleDescription.admin',
  [UserRole.EVENT_MANAGER]: 'users.roleDescription.eventManager',
  [UserRole.EVENT_COORDINATOR]: 'users.roleDescription.eventCoordinator',
  [UserRole.SUPPORT]: 'users.roleDescription.support',
  [UserRole.VIEWER]: 'users.roleDescription.viewer',
} as const satisfies Record<UserRole, string>

/**
 * Статус пользователя
 */
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  INVITED: 'invited', // Приглашён, но ещё не активирован
  SUSPENDED: 'suspended', // Приостановлен
} as const

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

/**
 * Лейблы статусов
 */
export const USER_STATUS_LABEL_KEYS = {
  [UserStatus.ACTIVE]: 'users.status.active',
  [UserStatus.INACTIVE]: 'users.status.inactive',
  [UserStatus.INVITED]: 'users.status.invited',
  [UserStatus.SUSPENDED]: 'users.status.suspended',
} as const satisfies Record<UserStatus, string>

/**
 * Права доступа в системе
 */
export const Permission = {
  // События
  EVENTS_CREATE: 'events.create',
  EVENTS_EDIT: 'events.edit',
  EVENTS_DELETE: 'events.delete',
  EVENTS_VIEW: 'events.view',
  EVENTS_PUBLISH: 'events.publish',

  // Участники
  PARTICIPANTS_MANAGE: 'participants.manage',
  PARTICIPANTS_VIEW: 'participants.view',
  PARTICIPANTS_EXPORT: 'participants.export',

  // Аналитика
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Пользователи
  USERS_MANAGE: 'users.manage',
  USERS_VIEW: 'users.view',
  USERS_INVITE: 'users.invite',

  // Настройки
  SETTINGS_MANAGE: 'settings.manage',
  SETTINGS_VIEW: 'settings.view',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]

/**
 * Группы прав для UI
 */
export type PermissionGroup = {
  label: string
  description: string
  permissions: {
    key: Permission
    label: string
    description: string
  }[]
}

/**
 * Структура групп прав доступа
 */
export type PermissionGroupKey = {
  labelKey: string
  descriptionKey: string
  permissions: {
    key: Permission
    labelKey: string
    descriptionKey: string
  }[]
}

export const PERMISSION_GROUP_KEYS: PermissionGroupKey[] = [
  {
    labelKey: 'users.permissions.groups.events.label',
    descriptionKey: 'users.permissions.groups.events.description',
    permissions: [
      {
        key: Permission.EVENTS_VIEW,
        labelKey: 'users.permissions.items.eventsView.label',
        descriptionKey: 'users.permissions.items.eventsView.description',
      },
      {
        key: Permission.EVENTS_CREATE,
        labelKey: 'users.permissions.items.eventsCreate.label',
        descriptionKey: 'users.permissions.items.eventsCreate.description',
      },
      {
        key: Permission.EVENTS_EDIT,
        labelKey: 'users.permissions.items.eventsEdit.label',
        descriptionKey: 'users.permissions.items.eventsEdit.description',
      },
      {
        key: Permission.EVENTS_PUBLISH,
        labelKey: 'users.permissions.items.eventsPublish.label',
        descriptionKey: 'users.permissions.items.eventsPublish.description',
      },
      {
        key: Permission.EVENTS_DELETE,
        labelKey: 'users.permissions.items.eventsDelete.label',
        descriptionKey: 'users.permissions.items.eventsDelete.description',
      },
    ],
  },
  {
    labelKey: 'users.permissions.groups.participants.label',
    descriptionKey: 'users.permissions.groups.participants.description',
    permissions: [
      {
        key: Permission.PARTICIPANTS_VIEW,
        labelKey: 'users.permissions.items.participantsView.label',
        descriptionKey: 'users.permissions.items.participantsView.description',
      },
      {
        key: Permission.PARTICIPANTS_MANAGE,
        labelKey: 'users.permissions.items.participantsManage.label',
        descriptionKey: 'users.permissions.items.participantsManage.description',
      },
      {
        key: Permission.PARTICIPANTS_EXPORT,
        labelKey: 'users.permissions.items.participantsExport.label',
        descriptionKey: 'users.permissions.items.participantsExport.description',
      },
    ],
  },
  {
    labelKey: 'users.permissions.groups.analytics.label',
    descriptionKey: 'users.permissions.groups.analytics.description',
    permissions: [
      {
        key: Permission.ANALYTICS_VIEW,
        labelKey: 'users.permissions.items.analyticsView.label',
        descriptionKey: 'users.permissions.items.analyticsView.description',
      },
      {
        key: Permission.ANALYTICS_EXPORT,
        labelKey: 'users.permissions.items.analyticsExport.label',
        descriptionKey: 'users.permissions.items.analyticsExport.description',
      },
    ],
  },
  {
    labelKey: 'users.permissions.groups.users.label',
    descriptionKey: 'users.permissions.groups.users.description',
    permissions: [
      {
        key: Permission.USERS_VIEW,
        labelKey: 'users.permissions.items.usersView.label',
        descriptionKey: 'users.permissions.items.usersView.description',
      },
      {
        key: Permission.USERS_INVITE,
        labelKey: 'users.permissions.items.usersInvite.label',
        descriptionKey: 'users.permissions.items.usersInvite.description',
      },
      {
        key: Permission.USERS_MANAGE,
        labelKey: 'users.permissions.items.usersManage.label',
        descriptionKey: 'users.permissions.items.usersManage.description',
      },
    ],
  },
  {
    labelKey: 'users.permissions.groups.settings.label',
    descriptionKey: 'users.permissions.groups.settings.description',
    permissions: [
      {
        key: Permission.SETTINGS_VIEW,
        labelKey: 'users.permissions.items.settingsView.label',
        descriptionKey: 'users.permissions.items.settingsView.description',
      },
      {
        key: Permission.SETTINGS_MANAGE,
        labelKey: 'users.permissions.items.settingsManage.label',
        descriptionKey: 'users.permissions.items.settingsManage.description',
      },
    ],
  },
]

export const getUserRoleLabel = (t: Translator) => createLabelGetter(USER_ROLE_LABEL_KEYS, t)
export const getUserRoleDescription = (t: Translator) =>
  createLabelGetter(USER_ROLE_DESCRIPTION_KEYS, t)
export const getUserStatusLabel = (t: Translator) => createLabelGetter(USER_STATUS_LABEL_KEYS, t)

export function getPermissionGroups(t: Translator): PermissionGroup[] {
  return PERMISSION_GROUP_KEYS.map(group => ({
    label: t(group.labelKey),
    description: t(group.descriptionKey),
    permissions: group.permissions.map(permission => ({
      key: permission.key,
      label: t(permission.labelKey),
      description: t(permission.descriptionKey),
    })),
  }))
}

/**
 * Роли с предустановленными правами
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: Object.values(Permission),
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.EVENT_MANAGER]: [
    Permission.EVENTS_VIEW,
    Permission.EVENTS_CREATE,
    Permission.EVENTS_EDIT,
    Permission.EVENTS_PUBLISH,
    Permission.EVENTS_DELETE,
    Permission.PARTICIPANTS_VIEW,
    Permission.PARTICIPANTS_MANAGE,
    Permission.PARTICIPANTS_EXPORT,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
  ],
  [UserRole.EVENT_COORDINATOR]: [
    Permission.EVENTS_VIEW,
    Permission.PARTICIPANTS_VIEW,
    Permission.PARTICIPANTS_MANAGE,
    Permission.PARTICIPANTS_EXPORT,
    Permission.ANALYTICS_VIEW,
  ],
  [UserRole.SUPPORT]: [
    Permission.EVENTS_VIEW,
    Permission.PARTICIPANTS_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
  [UserRole.VIEWER]: [Permission.EVENTS_VIEW, Permission.ANALYTICS_VIEW],
}

/**
 * Модель пользователя
 */
export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl?: string | null
  role: UserRole
  permissions: Permission[]
  status: UserStatus
  phone?: string | null
  position?: string | null // Должность
  department?: string | null // Отдел
  lastLoginAt?: string | null
  invitedAt?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Запрос на создание пользователя
 */
export type CreateUserRequest = {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  permissions?: Permission[] // Опционально, если хотим переопределить права роли
  phone?: string
  position?: string
  department?: string
  sendInvite?: boolean // Отправить приглашение на email
}

/**
 * Запрос на обновление пользователя
 */
export type UpdateUserRequest = Partial<
  Pick<
    CreateUserRequest,
    'firstName' | 'lastName' | 'role' | 'permissions' | 'phone' | 'position' | 'department'
  >
> & {
  status?: UserStatus
}

/**
 * Ответ при получении списка пользователей
 */
export type GetUsersResponse = {
  users: User[]
  total: number
  page: number
  limit: number
}

/**
 * Параметры запроса списка пользователей
 */
export type GetUsersParams = {
  page?: number
  limit?: number
  search?: string
  role?: UserRole
  status?: UserStatus
  sortBy?: 'createdAt' | 'lastName' | 'lastLoginAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Ответ при создании/обновлении пользователя
 */
export type UserResponse = {
  user: User
}

/**
 * Запрос на повторную отправку приглашения
 */
export type ResendInviteRequest = {
  userId: string
}

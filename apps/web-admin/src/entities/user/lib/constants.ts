/**
 * Экспорт констант для работы с пользователями
 */

export {
  UserRole,
  UserStatus,
  Permission,
  USER_ROLE_LABEL_KEYS,
  USER_ROLE_DESCRIPTION_KEYS,
  USER_STATUS_LABEL_KEYS,
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
} from '@api/services/user.types'

export type {
  User,
  PermissionGroup,
  CreateUserRequest,
  UpdateUserRequest,
  GetUsersParams,
} from '@api/services/user.types'

// Переэкспортируем форм-типы из features/users
export type { CreateUserFormValues, UpdateUserFormValues } from '@features/users'

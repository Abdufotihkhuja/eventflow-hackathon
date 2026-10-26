/**
 * Типы для управления приглашениями в организацию (organization invites).
 */

/** Способ аутентификации, доступный для приглашённого email */
export type InviteAuthMethod = 'password' | 'google' | 'linkedin'

/** Статус приглашения */
export type InviteStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'REVOKED'
  /** Приглашённый отказался — может оставить комментарий (declineReason) */
  | 'DECLINED'

/**
 * Действие, которое нужно совершить просматривающему, чтобы принять приглашение.
 */
export type InviteNextAction =
  | 'LOGIN_TO_ACCEPT'
  | 'SIGNUP_TO_ACCEPT'
  | 'ACCEPT_INVITE'
  | 'WRONG_ACCOUNT'
  | 'ALREADY_ACCEPTED'
  | 'EXPIRED'
  | 'REVOKED'

export type InviteRoleRef = {
  id: string
  name: string
}

/**
 * Публичный просмотр приглашения по токену.
 * GET /api/v1/organizations/invites/:token
 */
export type InvitePreview = {
  status: InviteStatus
  organizationName: string
  email: string
  role: InviteRoleRef
  userExists: boolean
  authMethods: InviteAuthMethod[]
  expiresAt: string
  /** true/false если viewer аутентифицирован, иначе null */
  currentUserMatch: boolean | null
  nextAction: InviteNextAction
}

/**
 * Запрос на принятие приглашения.
 * POST /api/v1/organizations/invites/:token/accept
 * Пароль передаётся ТОЛЬКО для новых пользователей (SIGNUP_TO_ACCEPT).
 */
export type AcceptInviteRequest = {
  password?: string
}

/**
 * Ответ на успешное принятие приглашения.
 */
export type AcceptInviteResponse = {
  code: 'MEMBERSHIP_CREATED'
  organizationId: string
  organizationName: string
  organizationMemberId: string
  role: InviteRoleRef
  requiresLogin: boolean
}

/**
 * Краткая сводка по приглашению (для админ-управления).
 */
export type InviteSummary = {
  id: string
  organizationId: string
  email: string
  status: InviteStatus
  role: InviteRoleRef
  expiresAt: string
  userExists: boolean
  firstName?: string | null
  lastName?: string | null
  createdAt: string
  /** Когда отказался приглашённый (status = DECLINED) */
  declinedAt?: string | null
  /** Комментарий приглашённого к отказу, если он его оставил */
  declineReason?: string | null
}

/**
 * Запрос на создание приглашения (админ).
 * POST /api/v1/organizations/invites
 */
export type CreateInviteRequest = {
  email: string
  roleId: string
  firstName?: string
  lastName?: string
  position?: string
  department?: string
}

/**
 * Детали ошибки при дубликате pending-приглашения (HTTP 409).
 * code: 'PENDING_INVITE_ALREADY_EXISTS'
 */
export type PendingInviteConflictDetails = {
  inviteId: string
  expiresAt: string
  canResend: boolean
}

/** Машиночитаемые коды ошибок приглашений */
export type InviteErrorCode =
  | 'AUTH_REQUIRED'
  | 'WRONG_ACCOUNT'
  | 'INVITE_EXPIRED'
  | 'INVITE_REVOKED'
  | 'INVITE_ALREADY_ACCEPTED'
  | 'INVITE_NOT_FOUND'
  | 'PASSWORD_REQUIRED_FOR_NEW_ACCOUNT'
  | 'PENDING_INVITE_ALREADY_EXISTS'
  | 'USER_ALREADY_ORGANIZATION_MEMBER'

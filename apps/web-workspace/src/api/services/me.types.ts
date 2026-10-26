/**
 * Типы для эндпоинтов текущего пользователя (`/me/*`).
 * Унифицированный вход + членство в организациях.
 */

import type { AuthTokens } from './auth.types'

/**
 * Запрос унифицированного входа (без ИНН).
 * POST /api/v1/auth/login
 */
export type UnifiedLoginRequest = {
  email: string
  password: string
}

/**
 * Ответ унифицированного входа — пара токенов.
 * Это пользовательская (USER) сессия, не привязанная к workspace.
 */
export type UnifiedLoginResponse = Pick<AuthTokens, 'accessToken' | 'refreshToken'> & {
  expiresIn?: number
}

/**
 * Регистрация аккаунта участника (USER).
 * POST /api/v1/auth/user/register
 *
 * Нужна на публичных страницах-приглашениях: принять приглашение спикера
 * можно только из-под участника, а отдельной страницы регистрации в кабинете нет.
 */
export type RegisterUserRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  passwordConfirm: string
}

/** Ответ регистрации — сразу пара токенов USER-сессии. */
export type RegisterUserResponse = Pick<AuthTokens, 'accessToken' | 'refreshToken'> & {
  expiresIn?: number
  emailVerificationRequired?: boolean
}

/** Тип членства: владелец организации или сотрудник */
export type MembershipKind = 'OWNER' | 'MEMBER'

/**
 * Членство текущего пользователя в организации.
 * GET /api/v1/me/organizations
 */
export type MyOrganizationMembership = {
  membershipId: string
  organizationId: string
  organizationMemberId: string
  name: string
  companyName?: string | null
  logoUrl?: string | null
  inn?: string | null
  verificationStatus?: string | null
  kind: MembershipKind
  isOwner: boolean
  roleName?: string | null
  permissions: string[]
}

export type MyOrganizationsResponse = MyOrganizationMembership[]

/**
 * Ответ на вход в workspace (enter-workspace).
 * POST /api/v1/me/organizations/:organizationId/session
 */
export type EnterWorkspaceResponse = Pick<AuthTokens, 'accessToken' | 'refreshToken'> & {
  expiresIn?: number
}

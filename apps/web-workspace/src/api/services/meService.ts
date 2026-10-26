/**
 * API сервис для текущего пользователя: унифицированный вход и членство в организациях.
 */

import { request } from '@api/apiClient'

import type {
  EnterWorkspaceResponse,
  MyOrganizationsResponse,
  RegisterUserRequest,
  RegisterUserResponse,
  UnifiedLoginRequest,
  UnifiedLoginResponse,
} from './me.types'

const AUTH_URL = '/v1/auth'
const ME_URL = '/v1/me'

export const meService = {
  /**
   * Унифицированный вход (без ИНН).
   * POST /api/v1/auth/login
   * skipAuth — токенов ещё нет, не нужно пытаться рефрешить на 401.
   */
  login: (payload: UnifiedLoginRequest) =>
    request<UnifiedLoginResponse, UnifiedLoginRequest>({
      method: 'POST',
      url: `${AUTH_URL}/login`,
      data: payload,
      skipAuth: true,
    }),

  /**
   * Регистрация аккаунта участника.
   * POST /api/v1/auth/user/register
   * skipAuth — токенов ещё нет, не нужно пытаться рефрешить на 401.
   */
  registerUser: (payload: RegisterUserRequest) =>
    request<RegisterUserResponse, RegisterUserRequest>({
      method: 'POST',
      url: `${AUTH_URL}/user/register`,
      data: payload,
      skipAuth: true,
    }),

  /**
   * Список активных членств текущего пользователя.
   * GET /api/v1/me/organizations
   */
  getMyOrganizations: () =>
    request<MyOrganizationsResponse>({
      method: 'GET',
      url: `${ME_URL}/organizations`,
    }),

  /**
   * Войти в workspace организации — выдаёт workspace-scoped токены.
   * POST /api/v1/me/organizations/:organizationId/session
   */
  enterWorkspace: (organizationId: string) =>
    request<EnterWorkspaceResponse>({
      method: 'POST',
      url: `${ME_URL}/organizations/${organizationId}/session`,
    }),
} as const

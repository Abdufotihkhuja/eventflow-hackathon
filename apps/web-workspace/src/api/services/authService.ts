import { request } from '@api/apiClient'
import { getRefreshToken } from '@api/config'
import { workspaceSdk } from '@api/sdk'

import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
  LogoutRequest,
  LogoutResponse,
  MemberLoginRequest,
  MemberLoginResponse,
  Organization,
  OrganizationLoginRequest,
  OrganizationLoginResponse,
  RefreshTokensRequest,
  RefreshTokensResponse,
  SessionResponse,
  TerminateOtherSessionsResponse,
  UpdateOrganizationProfileRequest,
  UploadLogoResponse,
} from './auth.types'

export interface SessionWorkspace {
  id: string
  name: string
  companyName?: string | null
  email: string
  logoUrl?: string | null
  verificationStatus?: string | null
}

export interface SessionMembership {
  id: string
  kind: string
  roleName?: string | null
  permissions: string[]
  organizationMemberId?: string | null
  workspace: SessionWorkspace
}

export interface SessionMeResponse {
  currentAccount: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
    avatarUrl?: string | null
    phone?: string | null
  }
  activeWorkspace?: SessionWorkspace | null
  memberships: SessionMembership[]
  platformRole?: string | null
  actorType: 'USER' | 'ORGANIZATION' | 'MEMBER' | 'SUPER_ADMIN'
  /**
   * Коды прав, закрытых маской доступа организации (тонкое управление
   * супер-админа). Применяется и к владельцу, и к сотрудникам. Сервер —
   * источник истины; кабинет лишь прячет соответствующие элементы.
   */
  accessDeniedPermissions?: string[]
}

function resolveWorkspaceActorType(session: SessionMeResponse): 'organization' | 'member' {
  if (session.actorType === 'ORGANIZATION') {
    return 'organization'
  }

  if (session.actorType === 'MEMBER') {
    return 'member'
  }

  throw new Error(`Unsupported session actor for workspace app: ${session.actorType}`)
}

const AUTH_BASE_URL = '/v1/auth'
const ORGANIZATIONS_BASE_URL = '/v1/organizations'

const authEndpoints = {
  // Organization auth
  organizationLogin: `${AUTH_BASE_URL}/organization/login`,
  organizationRegister: `${AUTH_BASE_URL}/organization/register`,

  // Member auth
  memberLogin: `${AUTH_BASE_URL}/member/login`,

  // Token & session
  refresh: `${AUTH_BASE_URL}/refresh`,
  logout: `${AUTH_BASE_URL}/logout`,

  // Common
  changePassword: `${AUTH_BASE_URL}/change-password`,

  // Organization profile (через /organizations)
  organizationMe: `${ORGANIZATIONS_BASE_URL}/me`,
} as const

export const authService = {
  // ================================
  // Авторизация организации
  // ================================

  /** Вход организации */
  loginOrganization: (payload: OrganizationLoginRequest) =>
    workspaceSdk.auth.loginOrganization(payload) as Promise<OrganizationLoginResponse>,

  // ================================
  // Авторизация сотрудника
  // ================================

  /** Вход сотрудника организации */
  loginMember: (payload: MemberLoginRequest) =>
    workspaceSdk.auth.loginMember(payload) as Promise<MemberLoginResponse>,

  // ================================
  // Сессия
  // ================================

  /** Канонический session bootstrap */
  getSessionMe: () => workspaceSdk.session.getMe() as Promise<SessionMeResponse>,

  /** Обновление токенов */
  refresh: (payload: RefreshTokensRequest) =>
    workspaceSdk.auth.refresh(payload) as Promise<RefreshTokensResponse>,

  /** Выход из системы */
  logout: (payload?: LogoutRequest) => workspaceSdk.auth.logout(payload) as Promise<LogoutResponse>,

  // ================================
  // Профиль организации
  // ================================

  /** Получение профиля workspace (GET /api/v1/workspace/me) */
  getOrganizationMe: () => workspaceSdk.auth.getOrganizationMe() as Promise<Organization>,

  /** Обновление профиля workspace (PATCH /api/v1/workspace/me) */
  updateOrganizationProfile: (payload: UpdateOrganizationProfileRequest) =>
    workspaceSdk.auth.updateOrganizationProfile(payload) as Promise<Organization>,

  /** Смена пароля (PATCH /api/v1/auth/change-password) */
  changePassword: (payload: ChangePasswordRequest) =>
    workspaceSdk.auth.changePassword(payload) as Promise<ChangePasswordResponse>,

  /** Активные сессии (GET /api/v1/auth/sessions) — текущая помечается через x-refresh-token */
  getSessions: () =>
    workspaceSdk.auth.getSessions(getRefreshToken() ?? undefined) as Promise<SessionResponse[]>,

  /** Завершить конкретную сессию (DELETE /api/v1/auth/sessions/:id) */
  terminateSession: (sessionId: string) =>
    workspaceSdk.auth.terminateSession(sessionId) as Promise<{ message: string }>,

  /** Завершить все сессии кроме текущей (DELETE /api/v1/auth/sessions) */
  terminateOtherSessions: () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return Promise.reject(new Error('No refresh token available'))
    }
    return workspaceSdk.auth.terminateOtherSessions(
      refreshToken
    ) as Promise<TerminateOtherSessionsResponse>
  },

  /** Загрузка логотипа организации */
  uploadOrganizationLogo: (file: File) => {
    return workspaceSdk.auth.uploadOrganizationLogo(file) as Promise<UploadLogoResponse>
  },

  /** Удаление логотипа организации */
  deleteOrganizationLogo: () =>
    workspaceSdk.auth.deleteOrganizationLogo() as Promise<{ message: string }>,

  /** Удаление workspace (DELETE /api/v1/workspace/me) */
  deleteAccount: (payload: DeleteAccountRequest) =>
    workspaceSdk.auth.deleteAccount() as Promise<DeleteAccountResponse>,

  /** Отметить доп. поля компании заполненными (POST /api/v1/workspace/me/complete-company-info) */
  completeCompanyInfo: () => workspaceSdk.auth.completeCompanyInfo() as Promise<Organization>,

  resolveCurrentActorType: (session: SessionMeResponse) => resolveWorkspaceActorType(session),
} as const

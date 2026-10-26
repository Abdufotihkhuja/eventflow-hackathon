import { useMutation } from '@tanstack/react-query'

import {
  authService,
  setAuthTokens,
  type ApiError,
  type MemberLoginRequest,
  type MemberLoginResponse,
  type OrganizationLoginRequest,
  type OrganizationLoginResponse,
} from '@api/index'
import { clearAppQueryCache } from '@shared/lib/query-client'

// ================================
// Organization Login
// ================================

const LOGIN_TYPE_STORAGE_KEY = 'auth.loginType'

export function getLoginType(): 'organization' | 'member' {
  if (typeof window === 'undefined') {
    return 'organization'
  }

  const value = window.localStorage.getItem(LOGIN_TYPE_STORAGE_KEY)
  return value === 'member' ? 'member' : 'organization'
}

export function clearLoginType(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(LOGIN_TYPE_STORAGE_KEY)
}

const organizationLoginKey = ['auth', 'login', 'organization'] as const

export type OrganizationLoginVariables = OrganizationLoginRequest & {
  rememberMe: boolean
}

type UseOrganizationLoginOptions = {
  onSuccess?: (data: OrganizationLoginResponse, variables: OrganizationLoginVariables) => void
  onError?: (error: ApiError, variables: OrganizationLoginVariables) => void
}

/**
 * Хук для авторизации организации
 * Отправляет запрос на /auth/organization/login и сохраняет токены
 */
export function useOrganizationLogin(options: UseOrganizationLoginOptions = {}) {
  return useMutation<OrganizationLoginResponse, ApiError, OrganizationLoginVariables>({
    mutationKey: organizationLoginKey,
    mutationFn: async ({ rememberMe, ...payload }) => {
      const data = await authService.loginOrganization(payload)

      const { accessToken, refreshToken } = data

      clearAppQueryCache()
      setAuthTokens({
        accessToken,
        refreshToken: rememberMe ? refreshToken : null,
      })

      const session = await authService.getSessionMe()
      authService.resolveCurrentActorType(session)

      return data
    },
    retry: false,
    onSuccess: (data, variables) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOGIN_TYPE_STORAGE_KEY, 'organization')
      }
      options.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      options.onError?.(error, variables)
    },
  })
}

// ================================
// Member Login
// ================================

const memberLoginKey = ['auth', 'login', 'member'] as const

export type MemberLoginVariables = MemberLoginRequest & {
  rememberMe: boolean
}

type UseMemberLoginOptions = {
  onSuccess?: (data: MemberLoginResponse, variables: MemberLoginVariables) => void
  onError?: (error: ApiError, variables: MemberLoginVariables) => void
}

/**
 * Хук для авторизации сотрудника организации
 * Отправляет запрос на /auth/member/login и сохраняет токены
 */
export function useMemberLogin(options: UseMemberLoginOptions = {}) {
  return useMutation<MemberLoginResponse, ApiError, MemberLoginVariables>({
    mutationKey: memberLoginKey,
    mutationFn: async ({ rememberMe, ...payload }) => {
      const data = await authService.loginMember(payload)

      const { accessToken, refreshToken } = data

      clearAppQueryCache()
      setAuthTokens({
        accessToken,
        refreshToken: rememberMe ? refreshToken : null,
      })

      const session = await authService.getSessionMe()
      authService.resolveCurrentActorType(session)

      return data
    },
    retry: false,
    onSuccess: (data, variables) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOGIN_TYPE_STORAGE_KEY, 'member')
      }
      options.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      options.onError?.(error, variables)
    },
  })
}

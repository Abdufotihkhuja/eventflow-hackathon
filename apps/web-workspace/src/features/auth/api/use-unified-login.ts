import { useMutation } from '@tanstack/react-query'

import {
  authService,
  meService,
  setAuthTokens,
  type ApiError,
  type MyOrganizationsResponse,
  type UnifiedLoginRequest,
} from '@api/index'
import type { SessionMeResponse } from '@api/services/authService'
import { rotateAppQueryScope } from '@shared/lib/query-client'

export type UnifiedLoginVariables = UnifiedLoginRequest & {
  rememberMe?: boolean
}

/**
 * Результат унифицированного входа: каноническая сессия и (для USER-аккаунтов)
 * список членств. Маршрутизацию выполняет вызывающая страница.
 */
export type UnifiedLoginResult = {
  session: SessionMeResponse
  /** Список членств — заполняется только для USER-аккаунтов (не владельцев организации). */
  memberships: MyOrganizationsResponse | null
}

type UseUnifiedLoginOptions = {
  onSuccess?: (data: UnifiedLoginResult, variables: UnifiedLoginVariables) => void
  onError?: (error: ApiError, variables: UnifiedLoginVariables) => void
}

const unifiedLoginKey = ['auth', 'login', 'unified'] as const

/**
 * Унифицированный вход без ИНН.
 *
 * 1. POST /auth/login → пара токенов (USER-сессия)
 * 2. getSessionMe() → определяем actorType
 * 3. Для не-владельцев (USER) подгружаем /me/organizations, чтобы страница
 *    решила: пустой стейт / один workspace / переключатель.
 *
 * ВАЖНО: для USER-сессии нельзя вызывать resolveCurrentActorType — он бросает
 * исключение на actorType === 'USER'.
 */
export function useUnifiedLogin(options: UseUnifiedLoginOptions = {}) {
  return useMutation<UnifiedLoginResult, ApiError, UnifiedLoginVariables>({
    mutationKey: unifiedLoginKey,
    mutationFn: async ({ rememberMe = true, ...payload }) => {
      const tokens = await meService.login(payload)

      rotateAppQueryScope('auth-pending')
      setAuthTokens({
        accessToken: tokens.accessToken,
        refreshToken: rememberMe ? tokens.refreshToken : null,
      })

      const session = await authService.getSessionMe()

      rotateAppQueryScope(
        session.activeWorkspace?.id
          ? `organization:${session.activeWorkspace.id}`
          : 'personal',
      )

      // Владельцы организации входят напрямую в workspace.
      if (session.actorType === 'ORGANIZATION') {
        return { session, memberships: null }
      }

      // USER-аккаунт: подгружаем членства для последующей маршрутизации.
      const memberships = await meService.getMyOrganizations()
      return { session, memberships }
    },
    retry: false,
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      options.onError?.(error, variables)
    },
  })
}

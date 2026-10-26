import { useMutation } from '@tanstack/react-query'

import { meService, setAuthTokens, type UnifiedLoginRequest } from '@api/index'
import { clearAppQueryCache } from '@shared/lib/query-client'

/**
 * Простой вход через POST /auth/login с сохранением токенов.
 *
 * Используется во flow принятия приглашения новым пользователем: после accept
 * нужно залогиниться по тем же email/паролю (requiresLogin: true), а затем войти
 * в workspace. Маршрутизацию по членствам здесь не выполняем.
 */
export function useMeLogin() {
  return useMutation({
    mutationFn: async (payload: UnifiedLoginRequest) => {
      const tokens = await meService.login(payload)

      clearAppQueryCache()
      setAuthTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })

      return tokens
    },
    meta: { skipToast: true },
  })
}

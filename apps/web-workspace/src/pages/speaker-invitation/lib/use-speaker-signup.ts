import { useMutation } from '@tanstack/react-query'

import { meService, setAuthTokens, type ApiError, type RegisterUserRequest } from '@api/index'
import { clearAppQueryCache } from '@shared/lib/query-client'

/**
 * Регистрация участника прямо со страницы приглашения спикера.
 *
 * Принять приглашение может только аккаунт участника (USER) с тем же email,
 * а отдельной страницы регистрации в кабинете нет — поэтому создаём аккаунт
 * здесь же. Ответ уже содержит пару токенов, дополнительный вход не нужен.
 */
export function useSpeakerSignup() {
  return useMutation<void, ApiError, RegisterUserRequest>({
    mutationFn: async payload => {
      const tokens = await meService.registerUser(payload)

      clearAppQueryCache()
      setAuthTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
    },
    retry: false,
    meta: { skipToast: true },
  })
}

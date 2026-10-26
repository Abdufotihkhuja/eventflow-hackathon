import { useMutation } from '@tanstack/react-query'

import { invitesService } from '@api/services'
import type { AcceptInviteResponse } from '@api/index'

type AcceptInviteVariables = {
  token: string
  password?: string
}

/**
 * Принятие приглашения по токену.
 * Пароль передаётся только для новых пользователей (SIGNUP_TO_ACCEPT).
 * Тосты подавлены — состояние отображается на странице.
 */
export function useAcceptInvite() {
  return useMutation<AcceptInviteResponse, unknown, AcceptInviteVariables>({
    mutationFn: ({ token, password }) =>
      invitesService.accept(token, password ? { password } : {}),
    meta: { skipToast: true },
  })
}

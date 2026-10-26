import { useMutation } from '@tanstack/react-query'

import {
  clearWorkspaceSelectionPending,
  meService,
  setAuthTokens,
  type ApiError,
  type EnterWorkspaceResponse,
} from '@api/index'
import { rotateAppQueryScope } from '@shared/lib/query-client'

/**
 * Вход в workspace организации.
 *
 * Обменивает текущую пользовательскую (USER) сессию на workspace-scoped токены
 * для конкретной организации. После этого приложение работает как организация/сотрудник.
 *
 * Сохраняет refresh-токен персистентно (вход в workspace — намеренное действие,
 * пользователь ожидает остаться в рабочем пространстве).
 */
export function useEnterWorkspace() {
  return useMutation<EnterWorkspaceResponse, ApiError, string>({
    mutationFn: async (organizationId: string) => {
      const tokens = await meService.enterWorkspace(organizationId)

      rotateAppQueryScope(`organization:${organizationId}`)
      setAuthTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
      // The session is now a workspace (ORGANIZATION/MEMBER) token — clear the
      // USER pending-selection flag so the route guards allow /dashboard.
      clearWorkspaceSelectionPending()

      return tokens
    },
    retry: false,
    meta: { skipToast: true },
  })
}

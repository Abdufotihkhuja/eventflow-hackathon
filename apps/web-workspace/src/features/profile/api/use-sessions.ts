import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authService } from '@api/services/authService'
import type {
  SessionResponse,
  TerminateOtherSessionsResponse,
} from '@api/services/auth.types'
import type { ApiError } from '@api/types'

export const SESSIONS_QUERY_KEY = ['auth', 'sessions'] as const

/** Активные сессии пользователя (GET /api/v1/auth/sessions) */
export function useSessionsQuery() {
  return useQuery<SessionResponse[], ApiError>({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: () => authService.getSessions(),
    staleTime: 30_000,
  })
}

type UseTerminateSessionOptions = {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}

/** Завершить конкретную сессию (DELETE /api/v1/auth/sessions/:id) */
export function useTerminateSession(options?: UseTerminateSessionOptions) {
  const queryClient = useQueryClient()
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: sessionId => authService.terminateSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY })
      options?.onSuccess?.()
    },
    onError: options?.onError,
  })
}

type UseTerminateOtherSessionsOptions = {
  onSuccess?: (data: TerminateOtherSessionsResponse) => void
  onError?: (error: ApiError) => void
}

/** Завершить все сессии кроме текущей (DELETE /api/v1/auth/sessions) */
export function useTerminateOtherSessions(options?: UseTerminateOtherSessionsOptions) {
  const queryClient = useQueryClient()
  return useMutation<TerminateOtherSessionsResponse, ApiError, void>({
    mutationFn: () => authService.terminateOtherSessions(),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY })
      options?.onSuccess?.(data)
    },
    onError: options?.onError,
  })
}

/**
 * TanStack Query хуки для работы с сессиями пользователя
 * GET /api/v1/auth/sessions
 * DELETE /api/v1/auth/sessions
 * DELETE /api/v1/auth/sessions/{id}
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { authService, type Session, type MessageResponse } from "@shared/api";

export const SESSIONS_QUERY_KEY = ["auth", "sessions"] as const;

/**
 * Хук для получения списка активных сессий
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSessionsQuery();
 *
 * return (
 *   <ul>
 *     {data?.map(session => (
 *       <li key={session.id}>{session.userAgent}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export const useSessionsQuery = (options?: {
  enabled?: boolean;
}): UseQueryResult<Session[], Error> => {
  return useQuery<Session[], Error>({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => authService.getSessions(),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // 30 секунд
  });
};

/**
 * Хук для завершения конкретной сессии
 *
 * @example
 * ```tsx
 * const terminateSession = useTerminateSessionMutation();
 *
 * const handleTerminate = (sessionId: string) => {
 *   terminateSession.mutate(sessionId, {
 *     onSuccess: () => toast.success('Сессия завершена'),
 *   });
 * };
 * ```
 */
export const useTerminateSessionMutation = (): UseMutationResult<
  MessageResponse,
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: async (sessionId: string) =>
      authService.terminateSession(sessionId),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
};

/**
 * Хук для завершения всех сессий кроме текущей
 *
 * @example
 * ```tsx
 * const terminateAll = useTerminateAllSessionsMutation();
 *
 * const handleTerminateAll = () => {
 *   terminateAll.mutate(undefined, {
 *     onSuccess: () => toast.success('Все сессии завершены'),
 *   });
 * };
 * ```
 */
export const useTerminateAllSessionsMutation = (): UseMutationResult<
  MessageResponse,
  Error,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation<MessageResponse, Error, void>({
    mutationFn: async () => authService.terminateAllSessions(),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
};

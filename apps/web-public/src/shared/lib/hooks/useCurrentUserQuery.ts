/**
 * TanStack Query хук для получения данных текущего пользователя
 * Session bootstrap:
 * - GET /api/v1/session/me
 * - затем профильный surface для USER
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { authService, type User } from "@shared/api";
import { ApiError } from "@shared/lib/apiClient";

export const CURRENT_USER_QUERY_KEY = ["user", "me"] as const;

/**
 * Получить профиль пользователя с graceful handling 401
 * При 401 возвращает null вместо выброса ошибки
 */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    const currentUser = await authService.getCurrentUser();

    if ("authProvider" in currentUser) {
      return currentUser;
    }

    return null;
  } catch (error) {
    // При 401 (Unauthorized) не бросаем ошибку - пользователь просто не авторизован
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Хук для получения данных текущего авторизованного пользователя
 * При отсутствии авторизации возвращает null без ошибки
 *
 * @param options - Опции для useQuery
 * @returns UseQueryResult с данными пользователя или null
 *
 * @example
 * ```tsx
 * const { data: user, isLoading } = useCurrentUserQuery();
 *
 * if (isLoading) return <Spinner />;
 * if (!user) return <LoginButton />;
 *
 * return <div>Привет, {user.name}!</div>;
 * ```
 */
export const useCurrentUserQuery = (options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}): UseQueryResult<User | null, Error> => {
  return useQuery<User | null, Error>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 минут по умолчанию
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    enabled: options?.enabled ?? true,
    retry: false, // Не повторять при ошибках авторизации
  });
};

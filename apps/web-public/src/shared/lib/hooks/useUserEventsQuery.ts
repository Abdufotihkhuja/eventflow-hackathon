/**
 * TanStack Query хуки для работы с событиями пользователя
 * GET /api/v1/account/me/events
 * GET /api/v1/account/me/events/stats
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useLocale } from "@eventflow/i18n/react";

import {
  userEventsService,
  USER_EVENTS_QUERY_KEYS,
  type UserEventsResponse,
  type UserEventsStats,
  type GetUserEventsParams,
  type UserEventItem,
  type UserEventInfo,
  type UserEventAttendance,
  type UserEventCertificate,
  type UserEventStatus,
  type UserEventRole,
  type UserEventFormat,
  type UserEventFilter,
} from "@shared/api/userEventsService";

// Re-export types
export type {
  UserEventsResponse,
  UserEventsStats,
  GetUserEventsParams,
  UserEventItem,
  UserEventInfo,
  UserEventAttendance,
  UserEventCertificate,
  UserEventStatus,
  UserEventRole,
  UserEventFormat,
  UserEventFilter,
};

export { USER_EVENTS_QUERY_KEYS };

// ============================================================================
// User Events Query Hook
// ============================================================================

interface UseUserEventsQueryOptions {
  /** Параметры запроса */
  params?: GetUserEventsParams;
  /** Включить ли запрос */
  enabled?: boolean;
  /** Время кеширования (по умолчанию 5 минут) */
  staleTime?: number;
  /** Интервал автообновления */
  refetchInterval?: number | false;
}

/**
 * Хук для получения списка событий пользователя
 * GET /api/v1/account/me/events
 *
 * @example
 * const { data, isLoading } = useUserEventsQuery({ params: { filter: "APPROVED" } });
 * console.log(data?.data); // UserEventItem[]
 * console.log(data?.stats); // UserEventsStats
 */
export function useUserEventsQuery(options?: UseUserEventsQueryOptions) {
  const {
    params,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 минут
    refetchInterval = false,
  } = options ?? {};
  const locale = useLocale();
  const paramsWithLocale = { ...params, locale };

  return useQuery({
    queryKey: USER_EVENTS_QUERY_KEYS.list(paramsWithLocale),
    queryFn: () => userEventsService.getUserEvents(paramsWithLocale),
    enabled,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// User Events Stats Query Hook
// ============================================================================

interface UseUserEventsStatsQueryOptions {
  /** Включить ли запрос */
  enabled?: boolean;
  /** Время кеширования (по умолчанию 5 минут) */
  staleTime?: number;
  /** Интервал автообновления */
  refetchInterval?: number | false;
}

/**
 * Хук для получения статистики событий пользователя
 * GET /api/v1/account/me/events/stats
 *
 * @example
 * const { data, isLoading } = useUserEventsStatsQuery();
 * console.log(data?.totalEvents); // 12
 * console.log(data?.attendedEvents); // 5
 */
export function useUserEventsStatsQuery(
  options?: UseUserEventsStatsQueryOptions
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 минут
    refetchInterval = false,
  } = options ?? {};

  return useQuery({
    queryKey: USER_EVENTS_QUERY_KEYS.stats(),
    queryFn: () => userEventsService.getUserEventsStats(),
    enabled,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// Invalidation Hook
// ============================================================================

/**
 * Хук для инвалидации кэша событий пользователя
 */
export function useInvalidateUserEvents() {
  const queryClient = useQueryClient();

  return {
    /** Инвалидировать весь кэш событий пользователя */
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: USER_EVENTS_QUERY_KEYS.all }),
    /** Инвалидировать список событий */
    invalidateList: (params?: GetUserEventsParams) =>
      queryClient.invalidateQueries({
        queryKey: USER_EVENTS_QUERY_KEYS.list(params),
      }),
    /** Инвалидировать статистику */
    invalidateStats: () =>
      queryClient.invalidateQueries({
        queryKey: USER_EVENTS_QUERY_KEYS.stats(),
      }),
  };
}

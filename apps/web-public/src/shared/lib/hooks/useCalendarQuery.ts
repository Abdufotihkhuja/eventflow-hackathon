/**
 * TanStack Query хуки для работы с календарём пользователя
 * Canonical endpoints:
 * - GET /api/v1/account/me/calendar
 * - GET /api/v1/account/me/calendar/events
 */

import { useQuery } from "@tanstack/react-query";

import { useLocale } from "@eventflow/i18n/react";

import {
  calendarService,
  CALENDAR_QUERY_KEYS,
  type CalendarMonthResponse,
  type CalendarEventsResponse,
  type GetCalendarParams,
  type GetCalendarEventsParams,
  type CalendarDay,
  type CalendarDayActivity,
  type CalendarEventItem,
  type CalendarRole,
  type CalendarDayType,
  type EventFormat,
} from "@shared/api/calendarService";

// Re-export types
export type {
  CalendarMonthResponse,
  CalendarEventsResponse,
  GetCalendarParams,
  GetCalendarEventsParams,
  CalendarDay,
  CalendarDayActivity,
  CalendarEventItem,
  CalendarRole,
  CalendarDayType,
  EventFormat,
};

export { CALENDAR_QUERY_KEYS };

// ============================================================================
// User Calendar Query Hook (по месяцу)
// ============================================================================

interface UseUserCalendarQueryOptions {
  /** Год (2020-2100) */
  year: number;
  /** Месяц (1-12) */
  month: number;
  /** Фильтр по роли */
  role?: CalendarRole;
  /** Включить ли запрос */
  enabled?: boolean;
  /** Время кеширования (по умолчанию 5 минут) */
  staleTime?: number;
  /** Интервал автообновления */
  refetchInterval?: number | false;
}

/**
 * Хук для получения календаря активности пользователя на указанный месяц
 * GET /api/v1/account/me/calendar
 *
 * @example
 * const { data, isLoading } = useUserCalendarQuery({ year: 2025, month: 3 });
 */
export function useUserCalendarQuery(options: UseUserCalendarQueryOptions) {
  const {
    year,
    month,
    role,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 минут
    refetchInterval = false,
  } = options;

  const locale = useLocale();
  const params: GetCalendarParams = { year, month, role, locale };

  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.userCalendar(params),
    queryFn: () => calendarService.getUserCalendar(params),
    enabled,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// Calendar Events Query Hook (по дате)
// ============================================================================

interface UseCalendarEventsQueryOptions {
  /** Дата в формате YYYY-MM-DD */
  date: string;
  /** Фильтр по роли */
  role?: CalendarRole;
  /** Включить ли запрос */
  enabled?: boolean;
  /** Время кеширования (по умолчанию 5 минут) */
  staleTime?: number;
}

/**
 * Хук для получения событий календаря на конкретную дату
 * GET /api/v1/account/me/calendar/events
 *
 * @example
 * const { data, isLoading } = useCalendarEventsQuery({ date: "2025-03-05" });
 */
export function useCalendarEventsQuery(options: UseCalendarEventsQueryOptions) {
  const {
    date,
    role,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 минут
  } = options;

  const locale = useLocale();
  const params: GetCalendarEventsParams = { date, role, locale };

  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.events(params),
    queryFn: () => calendarService.getCalendarEvents(params),
    enabled: enabled && !!date,
    staleTime,
    refetchOnWindowFocus: false,
  });
}

/**
 * Хук для получения текущего месяца календаря
 */
export function useCurrentMonthCalendar(options?: {
  role?: CalendarRole;
  enabled?: boolean;
}) {
  const now = new Date();
  return useUserCalendarQuery({
    year: now.getFullYear(),
    month: now.getMonth() + 1, // JS months are 0-indexed
    role: options?.role,
    enabled: options?.enabled,
  });
}

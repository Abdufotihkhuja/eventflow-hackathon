/**
 * API-сервис для работы с календарём пользователя
 * Endpoints: /api/v1/account/me/calendar*
 */

import { accountSdk } from "./sdk";

// ============================================================================
// Типы роли пользователя в событии
// ============================================================================

export type CalendarRole = "PARTICIPANT" | "SPEAKER" | "MENTOR";

export type CalendarDayType = "EVENT" | "TRAVEL" | "PREPARATION";

// ============================================================================
// Типы для GET /api/v1/account/me/calendar
// ============================================================================

/**
 * Активность в конкретный день
 */
export interface CalendarDayActivity {
  registrationId: string;
  eventId: string;
  /** Slug для ссылки /events/[slug], приходит с API как eventSlug */
  eventSlug?: string;
  /** @deprecated используйте eventSlug */
  slug?: string;
  eventTitle: string;
  role: CalendarRole;
  dayType: CalendarDayType;
}

/**
 * День в календаре
 */
export interface CalendarDay {
  /** Дата в формате YYYY-MM-DD */
  date: string;
  /** Число месяца */
  day: number;
  /** Активности в этот день */
  activities: CalendarDayActivity[];
  /** Есть ли события где пользователь спикер */
  hasSpeakerEvents: boolean;
  /** Есть ли события где пользователь участник */
  hasParticipantEvents: boolean;
  /** Есть ли события где пользователь ментор */
  hasMentorEvents: boolean;
  /** Есть ли дорога/перелёт */
  hasTravel: boolean;
  /** Есть ли подготовка */
  hasPreparation: boolean;
}

/**
 * Ответ от GET /api/v1/account/me/calendar
 */
export interface CalendarMonthResponse {
  year: number;
  month: number;
  eventsCount: number;
  travelsCount: number;
  days: CalendarDay[];
}

// ============================================================================
// Типы для GET /api/v1/account/me/calendar/events
// ============================================================================

export type EventFormat = "ONLINE" | "OFFLINE" | "HYBRID";

/**
 * Событие на конкретную дату
 */
export interface CalendarEventItem {
  registrationId: string;
  eventId: string;
  /** Slug для ссылки /events/[slug], приходит с API как eventSlug */
  eventSlug?: string;
  /** @deprecated используйте eventSlug */
  slug?: string;
  title: string;
  shortDescription?: string;
  role: CalendarRole;
  dayType: CalendarDayType;
  format: EventFormat;
  startDate: string;
  endDate?: string;
  venue?: string;
  city?: string;
  organizationName: string;
}

/**
 * Ответ от GET /api/v1/account/me/calendar/events
 */
export interface CalendarEventsResponse {
  date: string;
  count: number;
  events: CalendarEventItem[];
}

// ============================================================================
// Типы запросов
// ============================================================================

export interface GetCalendarParams {
  /** Год (2020-2100) */
  year: number;
  /** Месяц (1-12) */
  month: number;
  /** Фильтр по роли */
  role?: CalendarRole;
  /** Локаль для локализованных бизнес-полей события (ru/uz/en) */
  locale?: string;
}

export interface GetCalendarEventsParams {
  /** Дата в формате YYYY-MM-DD */
  date: string;
  /** Фильтр по роли */
  role?: CalendarRole;
  /** Локаль для локализованных бизнес-полей события (ru/uz/en) */
  locale?: string;
}

// ============================================================================
// API Endpoints согласно Swagger
// ============================================================================

export const CALENDAR_QUERY_KEYS = {
  all: ["calendar"] as const,
  userCalendar: (params: GetCalendarParams) =>
    [
      ...CALENDAR_QUERY_KEYS.all,
      "month",
      params.year,
      params.month,
      params.role,
    ] as const,
  events: (params: GetCalendarEventsParams) =>
    [...CALENDAR_QUERY_KEYS.all, "events", params.date, params.role] as const,
} as const;

export const calendarService = {
  /**
   * Получить календарь активности пользователя на указанный месяц
   * GET /api/v1/account/me/calendar
   * Требует авторизации
   *
   * @param params.year - Год (2020-2100)
   * @param params.month - Месяц (1-12)
   * @param params.role - Опциональный фильтр по роли: PARTICIPANT, SPEAKER, MENTOR
   */
  getUserCalendar: async (
    params: GetCalendarParams
  ): Promise<CalendarMonthResponse> => {
    return accountSdk.calendar.getCalendar(
      params as never
    ) as Promise<CalendarMonthResponse>;
  },

  /**
   * Получить события на конкретную дату
   * GET /api/v1/account/me/calendar/events
   * Требует авторизации
   *
   * @param params.date - Дата в формате YYYY-MM-DD
   * @param params.role - Опциональный фильтр по роли: PARTICIPANT, SPEAKER, MENTOR
   */
  getCalendarEvents: async (
    params: GetCalendarEventsParams
  ): Promise<CalendarEventsResponse> => {
    return accountSdk.calendar.getCalendarEvents(
      params as never
    ) as unknown as Promise<CalendarEventsResponse>;
  },
};

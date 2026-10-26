/**
 * API-сервис для работы с событиями пользователя
 * GET /api/v1/account/me/events - Получить события пользователя
 * GET /api/v1/account/me/events/stats - Получить статистику событий
 */

import { accountSdk } from "./sdk";

// ============================================================================
// Типы для событий пользователя
// ============================================================================

export type UserEventStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "ATTENDED"
  | "WAITLISTED";
export type UserEventRole = "PARTICIPANT" | "SPEAKER" | "MENTOR";
export type UserEventFormat = "ONLINE" | "OFFLINE" | "HYBRID";
export type UserEventFilter =
  | "ALL"
  | "APPROVED"
  | "PENDING"
  | "ATTENDED"
  | "CANCELLED";

/** Статус события на платформе (поле event.status в ответе GET /api/v1/account/me/events) */
export type PublicEventStatus =
  | "PUBLISHED"
  | "COMPLETED"
  | "CANCELLED"
  | "DRAFT"
  | (string & Record<never, never>);

/**
 * Информация о событии в контексте пользователя (вложенный объект event в data[])
 * coverImage: URL или шаблон вида "template:golden_hour"
 */
export interface UserEventInfo {
  id: string;
  /** Slug для ссылки /events/[slug]; бэкенд отдаёт в ответе */
  slug?: string;
  title: string;
  coverImage?: string | null;
  shortDescription?: string | null;
  startDate: string;
  endDate?: string | null;
  format: UserEventFormat;
  venue?: string | null;
  city?: string | null;
  status: PublicEventStatus;
  organizationName: string;
}

/**
 * Посещение (чек-ин) по дате
 * attendances[] в элементе data
 */
export interface UserEventAttendance {
  id: string;
  checkInAt: string;
  checkInDate: string;
}

/**
 * Сертификат по регистрации (если выдан)
 * certificate в элементе data — опционально
 */
export interface UserEventCertificate {
  id: string;
  certificateUrl: string;
  generatedAt: string;
}

/**
 * Элемент списка: регистрация пользователя на событие
 * Соответствует одному элементу data[] в ответе GET /api/v1/account/me/events
 */
export interface UserEventItem {
  id: string;
  status: UserEventStatus;
  role: UserEventRole;
  qrCode: string;
  rejectionReason?: string | null;
  createdAt: string;
  event: UserEventInfo;
  attendances: UserEventAttendance[];
  certificate?: UserEventCertificate;
  isAttended: boolean;
  isPastEvent: boolean;
}

/**
 * Статистика событий пользователя
 * Поле stats в ответе GET /api/v1/account/me/events (и ответ GET /api/v1/account/me/events/stats)
 */
export interface UserEventsStats {
  totalEvents: number;
  approvedEvents: number;
  pendingEvents: number;
  attendedEvents: number;
  cancelledEvents: number;
  certificatesCount: number;
}

/**
 * Ответ GET /api/v1/account/me/events
 * data — список регистраций, stats — агрегат для «Быстрой статистики» и фильтров
 */
export interface UserEventsResponse {
  data: UserEventItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: UserEventsStats;
}

// ============================================================================
// Типы параметров запросов
// ============================================================================

export interface GetUserEventsParams {
  /** Номер страницы (по умолчанию 1) */
  page?: number;
  /** Количество элементов на странице (по умолчанию 10) */
  limit?: number;
  /** Фильтр событий */
  filter?: UserEventFilter;
  /** Поиск по названию события */
  search?: string;
  /** Локаль для локализованных бизнес-полей события (ru/uz/en) */
  locale?: string;
}

// ============================================================================
// API Endpoints
// ============================================================================

export const USER_EVENTS_QUERY_KEYS = {
  all: ["userEvents"] as const,
  list: (params?: GetUserEventsParams) =>
    [...USER_EVENTS_QUERY_KEYS.all, "list", params] as const,
  stats: () => [...USER_EVENTS_QUERY_KEYS.all, "stats"] as const,
} as const;

export const userEventsService = {
  /**
   * Получить список событий пользователя
   * GET /api/v1/account/me/events
   * Требует авторизации
   *
   * @param params - Параметры запроса (page, limit, filter, search)
   * @returns Список событий с пагинацией и статистикой
   */
  getUserEvents: async (
    params?: GetUserEventsParams
  ): Promise<UserEventsResponse> => {
    const res = (await accountSdk.userEvents.getUserEvents(
      params as never
    )) as UserEventsResponse;
    // Нормализуем event.slug для ссылок /events/[slug] (бэкенд может отдавать slug в ответе)
    res.data = res.data.map((item) => ({
      ...item,
      event: {
        ...item.event,
        slug:
          item.event.slug ??
          (item.event as { slug?: string }).slug ??
          undefined,
      },
    }));
    return res;
  },

  /**
   * Получить статистику событий пользователя
   * GET /api/v1/account/me/events/stats
   * Требует авторизации
   *
   * @returns Статистика событий
   */
  getUserEventsStats: async (): Promise<UserEventsStats> => {
    return accountSdk.userEvents.getUserEventsStats() as Promise<UserEventsStats>;
  },
};

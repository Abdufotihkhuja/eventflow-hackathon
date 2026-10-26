/**
 * API-сервис для работы с публичными мероприятиями
 * Endpoints согласно EventFlow Swagger API v1
 */

import { apiGet } from "../lib/apiClient";

// ============================================================================
// Типы событий (публичное API)
// ============================================================================

export type EventFormat = "ONLINE" | "OFFLINE" | "HYBRID";
export type EventStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "CANCELLED"
  | "COMPLETED";
export type RegistrationStatus = "OPEN" | "CLOSED" | "WAITLIST";
export type EventAccessType = "OPEN" | "REQUEST" | "INVITE_ONLY" | "PRIVATE";
export type RegistrationMode = "SIMPLE" | "QUESTIONS" | "TEST";
export type SpeakerInvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export type AgendaItemType =
  | "PRESENTATION"
  | "WORKSHOP"
  | "PANEL"
  | "BREAK"
  | "NETWORKING"
  | "REGISTRATION"
  | "KEYNOTE"
  | "QA"
  | "OTHER";

/**
 * Категории событий (значения API / фильтры)
 * Используются для фильтрации в каталоге
 */
export type EventCategory =
  | "business-training"
  | "business-meetings"
  | "workshops"
  | "conference"
  | "forum"
  | "hackathon"
  | "ideathon";

export interface PublicEventOrganization {
  id: string;
  name: string;
  companyName?: string;
  logoUrl?: string;
  description?: string;
  verified?: boolean;
}

export interface PublicEvent {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  /**
   * Путь к изображению обложки события
   * Может быть в следующих форматах:
   * - "template:purple_sunset" - шаблон изображения
   * - "/uploads/file.jpg" - относительный путь к загруженному файлу
   * - "https://example.com/image.jpg" - абсолютный URL (редко)
   */
  coverImage?: string;
  format: EventFormat;
  status: EventStatus;
  type: EventPaymentType; // FREE или PAID
  accessType?: EventAccessType;
  startDate: string;
  endDate?: string;
  timezone?: string;
  city?: string;
  venue?: string;
  location?: string; // Алиас для venue или вычисляемое значение
  address?: string;
  /** Широта для карты (Яндекс.Карты) */
  latitude?: string;
  /** Долгота для карты (Яндекс.Карты) */
  longitude?: string;
  onlineUrl?: string;
  maxParticipants?: number;
  registrationsCount?: number;
  isFeatured?: boolean;
  /** API может вернуть строкой (например "200000") */
  price?: number | string;
  currency?: string;
  /** Тематики события (M2M): slug + локализованное название */
  categories?: Array<{ slug: string; name: string }>;
  tags?: string[];
  organization: PublicEventOrganization;
  registrationStatus?: RegistrationStatus;
  registrationDeadline?: string;
  registrationMode?: RegistrationMode;
  createdAt?: string;
  updatedAt?: string;
}

/** Регистрация текущего пользователя на событие (при запросе с JWT) */
export interface EventMyRegistration {
  id: string;
  status: string;
  eventId: string;
}

export interface PublicEventDetail extends PublicEvent {
  content?: string;
  agendaItems?: EventAgendaItem[];
  speakers?: EventSpeaker[];
  faqs?: EventFaq[];
  gallery?: string[];
  requirements?: string[];
  benefits?: string[];
  inviteCode?: string;
  rejectionReason?: string;
  testEvaluationType?: string;
  minTestScore?: number;
  maxTestScore?: number;
  /** Регистрация текущего пользователя (не null при запросе с Authorization) */
  myRegistration?: EventMyRegistration | null;
}

/** Спикер события */
export interface EventSpeaker {
  id: string;
  eventId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  position?: string;
  company?: string;
  bio?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  invitationStatus?: SpeakerInvitationStatus;
  invitedEmail?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Элемент программы события */
export interface EventAgendaItem {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  type?: AgendaItemType;
  date?: string;
  startTime?: string;
  duration?: number; // в минутах
  location?: string;
  materials?: string[];
  sortOrder?: number;
  speakers?: EventSpeaker[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EventFaq {
  id: string;
  question: string;
  answer: string;
}

// ============================================================================
// Типы запросов и ответов (согласно Swagger API)
// ============================================================================

/** Тип оплаты события */
export type EventPaymentType = "FREE" | "PAID";

/** Фильтр времени событий */
export type EventTimeFilter = "upcoming" | "past" | "all";

export interface PublicEventsParams {
  /** Номер страницы (по умолчанию 1) */
  page?: number;
  /** Количество на странице (по умолчанию 10, макс. 50) */
  limit?: number;
  /** Поиск по названию */
  search?: string;
  /** Фильтр по городу */
  city?: string;
  /** Формат: ONLINE, OFFLINE, HYBRID */
  format?: EventFormat;
  /** Тип оплаты: FREE или PAID */
  type?: EventPaymentType;
  /** Фильтр по времени: upcoming (предстоящие), past (прошедшие), all (все) */
  filter?: EventTimeFilter;
  /** Только топовые события */
  featured?: boolean;
  /** Фильтр по slug категории */
  category?: EventCategory | string;
  /** Locale for localized public business fields */
  locale?: "ru" | "uz" | "en";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicEventsResponse {
  items: PublicEvent[]; // API использует items вместо data
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CanRegisterReasonCode =
  | "PRIVATE"
  | "NOT_PUBLISHED"
  | "DEADLINE_PASSED"
  | "CAPACITY_FULL"
  | "MANUALLY_CLOSED";

export interface CanRegisterResponse {
  canRegister: boolean;
  /** Server-localized fallback message (currently always Russian). Prefer `reasonCode`. */
  reason?: string;
  /** Stable code so the frontend can render a localized message. */
  reasonCode?: CanRegisterReasonCode;
  isRegistered?: boolean;
  registrationId?: string;
  waitlistPosition?: number;
  /** Тип доступа: OPEN, REQUEST, INVITE_ONLY, PRIVATE. Поле кода приглашения — только при INVITE_ONLY */
  accessType?: EventAccessType;
  /** Требуется код приглашения (INVITE_ONLY) */
  requiresInviteCode?: boolean;
}

// ============================================================================
// API Endpoints согласно Swagger
// ============================================================================

/** Статус событий организатора: предстоящие или прошедшие */
export type OrganizationEventsStatus = "upcoming" | "past";

export interface OrganizationEventsParams {
  status: OrganizationEventsStatus;
  page?: number;
  limit?: number;
}

const EVENT_ENDPOINTS = {
  PUBLIC_EVENTS: "/api/v1/public/events",
  PUBLIC_EVENT_BY_ID: (id: string) => `/api/v1/public/events/${id}`,
  PUBLIC_EVENT_BY_SLUG: (slug: string) =>
    `/api/v1/public/events/by-slug/${encodeURIComponent(slug)}`,
  CAN_REGISTER: (id: string) => `/api/v1/public/events/${id}/can-register`,
  DESCRIPTION_HTML: (id: string) => `/api/v1/events/${id}/description/html`,
  DESCRIPTION_TEXT: (id: string) => `/api/v1/events/${id}/description/text`,
  /** События организатора (требует авторизации USER) */
  ORGANIZATION_EVENTS: (orgId: string) =>
    `/api/v1/events/organizations/${orgId}/events`,
} as const;

// ============================================================================
// Query Keys для TanStack Query
// ============================================================================

export const EVENT_QUERY_KEYS = {
  all: ["events"] as const,
  lists: () => [...EVENT_QUERY_KEYS.all, "list"] as const,
  list: (params?: PublicEventsParams) =>
    [...EVENT_QUERY_KEYS.lists(), params] as const,
  organizationEvents: (orgId: string, params?: OrganizationEventsParams) =>
    [...EVENT_QUERY_KEYS.all, "organization", orgId, params] as const,
  featured: () => [...EVENT_QUERY_KEYS.all, "featured"] as const,
  details: () => [...EVENT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EVENT_QUERY_KEYS.details(), id] as const,
  detailBySlug: (slug: string, inviteCode?: string) =>
    [...EVENT_QUERY_KEYS.details(), "slug", slug, inviteCode] as const,
  canRegister: (id: string) =>
    [...EVENT_QUERY_KEYS.all, "can-register", id] as const,
  description: (id: string) =>
    [...EVENT_QUERY_KEYS.all, "description", id] as const,
} as const;

/** Максимальный limit для GET /api/v1/public/events (ограничение API) */
export const PUBLIC_EVENTS_MAX_LIMIT = 50;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Формирование query-параметров для списка событий
 * Поддерживаемые параметры: page, limit, search, city, format, type, filter
 * limit автоматически ограничивается PUBLIC_EVENTS_MAX_LIMIT
 */
function buildEventsQueryParams(params?: PublicEventsParams): string {
  if (!params) return "";

  const entries: [string, string][] = [];

  const addParam = (
    key: string,
    value: string | number | boolean | undefined
  ): void => {
    if (value !== undefined && value !== null && value !== "") {
      entries.push([key, String(value)]);
    }
  };

  addParam("page", params.page);
  addParam(
    "limit",
    params.limit != null
      ? Math.min(params.limit, PUBLIC_EVENTS_MAX_LIMIT)
      : undefined
  );
  addParam("search", params.search);
  addParam("city", params.city);
  addParam("format", params.format);
  addParam("type", params.type);
  addParam("filter", params.filter);
  addParam("featured", params.featured);
  addParam("category", params.category);
  addParam("locale", params.locale);

  return entries.length > 0 ? new URLSearchParams(entries).toString() : "";
}

function buildOrganizationEventsQueryParams(
  params: OrganizationEventsParams
): string {
  const entries: [string, string][] = [];
  const add = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== null) entries.push([k, String(v)]);
  };
  add("status", params.status);
  add("page", params.page);
  add("limit", params.limit);
  return entries.length > 0 ? new URLSearchParams(entries).toString() : "";
}

// ============================================================================
// Event Service
// ============================================================================

export const eventService = {
  /**
   * Получить список публичных мероприятий
   * GET /api/v1/public/events
   * При авторизации токен передаётся (бэкенд может учитывать для кэша/персонализации).
   */
  getPublicEvents: async (
    params?: PublicEventsParams
  ): Promise<PublicEventsResponse> => {
    const query = buildEventsQueryParams(params);
    const url = query
      ? `${EVENT_ENDPOINTS.PUBLIC_EVENTS}?${query}`
      : EVENT_ENDPOINTS.PUBLIC_EVENTS;
    return apiGet<PublicEventsResponse>(url, { skipAuth: true });
  },

  /**
   * Получить события организатора (предстоящие или прошедшие).
   * GET /api/v1/events/organizations/:id/events
   * Публичный эндпоинт (OptionalJwtAuthGuard): 401 не редиректит на /login.
   */
  getOrganizationEvents: async (
    organizationId: string,
    params: OrganizationEventsParams
  ): Promise<PublicEventsResponse> => {
    const query = buildOrganizationEventsQueryParams(params);
    const base = EVENT_ENDPOINTS.ORGANIZATION_EVENTS(organizationId);
    const url = query ? `${base}?${query}` : base;
    const raw = await apiGet<
      Omit<PublicEventsResponse, "items"> & { data: PublicEvent[] }
    >(url, { skipAuthRedirect: true });
    return {
      items: raw.data,
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
      totalPages: raw.totalPages,
    };
  },

  /**
   * Получить топовые мероприятия (isFeatured = true)
   * GET /api/v1/public/events?featured=true&limit=N
   */
  getFeaturedEvents: async (
    limit = 10,
    locale?: PublicEventsParams["locale"]
  ): Promise<PublicEventsResponse> => {
    return eventService.getPublicEvents({ featured: true, limit, locale });
  },

  /**
   * Получить публичное мероприятие по ID
   * GET /api/v1/public/events/{id}
   * При запросе с JWT в ответе приходит myRegistration (регистрация текущего пользователя).
   */
  getPublicEventById: async (
    id: string,
    locale?: PublicEventsParams["locale"]
  ): Promise<PublicEventDetail> => {
    const query = locale ? `?locale=${locale}` : "";
    return apiGet<PublicEventDetail>(
      `${EVENT_ENDPOINTS.PUBLIC_EVENT_BY_ID(id)}${query}`,
      { skipAuth: true }
    );
  },

  /**
   * Проверить возможность регистрации на мероприятие.
   * GET /api/v1/public/events/{id}/can-register — публичный эндпоинт.
   * Avoid `publicSdk.events.canRegister` here: its transport double-prefixes
   * `/api`, so the request lands at `/api/api/v1/...` and 404s. Match the
   * other public endpoints in this file and call `apiGet` directly.
   *
   * `inviteCode` matters only for PRIVATE events, where it carries the guest's
   * personal invitation token; without it a PRIVATE event never opens.
   */
  canRegister: async (
    eventId: string,
    inviteCode?: string
  ): Promise<CanRegisterResponse> => {
    const query = inviteCode
      ? `?${new URLSearchParams({ inviteCode }).toString()}`
      : "";
    return apiGet<CanRegisterResponse>(
      `${EVENT_ENDPOINTS.CAN_REGISTER(eventId)}${query}`,
      { skipAuth: true }
    );
  },

  /**
   * Получить событие по slug
   * GET /api/v1/public/events/by-slug/:slug
   *
   * Эндпоинт работает анонимно (OptionalJwtAuthGuard на бэке), но если токен
   * отправлен — в ответ добавляется `myRegistration`, что нужно странице
   * регистрации, чтобы понять «уже зарегистрирован» и не показывать CTA
   * повторно. Поэтому НЕ ставим skipAuth: true.
   */
  getEventBySlug: async <T = PublicEventDetail>(
    slug: string,
    locale?: PublicEventsParams["locale"],
    inviteCode?: string
  ): Promise<T> => {
    const queryParams = new URLSearchParams();
    if (locale) queryParams.set("locale", locale);
    if (inviteCode) queryParams.set("inviteCode", inviteCode);
    const query = queryParams.size > 0 ? `?${queryParams.toString()}` : "";
    return apiGet<T>(`${EVENT_ENDPOINTS.PUBLIC_EVENT_BY_SLUG(slug)}${query}`);
  },

  /**
   * Получить описание события в HTML
   * GET /api/v1/events/:id/description/html
   */
  getEventDescriptionHtml: async (
    eventId: string
  ): Promise<{ html: string }> => {
    return apiGet<{ html: string }>(EVENT_ENDPOINTS.DESCRIPTION_HTML(eventId), {
      skipAuth: true,
    });
  },

  /**
   * Получить описание события в виде текста
   * GET /api/v1/events/:id/description/text
   */
  getEventDescriptionText: async (
    eventId: string
  ): Promise<{ text: string }> => {
    return apiGet<{ text: string }>(EVENT_ENDPOINTS.DESCRIPTION_TEXT(eventId), {
      skipAuth: true,
    });
  },

  // Поддерживает id в виде slug или uuid
  async getEvents<T = PublicEventsResponse>(): Promise<T> {
    return apiGet<T>(EVENT_ENDPOINTS.PUBLIC_EVENTS, { skipAuth: true });
  },

  /** Получить событие по id (uuid). Для slug используйте getEventBySlug */
  async getEventByIdOrSlug<T = PublicEventDetail>(
    idOrSlug: string
  ): Promise<T> {
    return apiGet<T>(EVENT_ENDPOINTS.PUBLIC_EVENT_BY_ID(idOrSlug));
  },
};

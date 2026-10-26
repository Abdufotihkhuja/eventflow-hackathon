/**
 * TanStack Query хуки для работы с публичными мероприятиями
 * GET /api/v1/public/events
 * GET /api/v1/public/events/{id}
 * GET /api/v1/public/events/{id}/can-register
 */

import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useLocale } from "@eventflow/i18n/react";

import {
  eventService,
  EVENT_QUERY_KEYS,
  type PublicEventsParams,
  type PublicEventsResponse,
  type PublicEventDetail,
  type CanRegisterResponse,
  type OrganizationEventsParams,
} from "@shared/api/eventService";

// ============================================================================
// Public Events List Query
// ============================================================================

interface UsePublicEventsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  params?: PublicEventsParams;
  /** Server-fetched first page, so the list renders in SSR HTML (SEO/GEO). */
  initialData?: PublicEventsResponse;
}

/**
 * Хук для получения списка публичных мероприятий
 * Поддерживает фильтрацию по формату, категории, городу и т.д.
 *
 * @example
 * ```tsx
 * // Все события
 * const { data } = usePublicEventsQuery();
 *
 * // Фильтр по категории и формату
 * const { data } = usePublicEventsQuery({
 *   params: {
 *     category: 'HACKATHON',
 *     format: 'OFFLINE',
 *   }
 * });
 * ```
 */
export const usePublicEventsQuery = (
  options?: UsePublicEventsQueryOptions
): UseQueryResult<PublicEventsResponse, Error> => {
  const locale = useLocale();
  const params = { ...options?.params, locale };

  return useQuery<PublicEventsResponse, Error>({
    queryKey: EVENT_QUERY_KEYS.list(params),
    queryFn: () => eventService.getPublicEvents(params),
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 минут
    enabled: options?.enabled ?? true,
    initialData: options?.initialData,
  });
};

// ============================================================================
// Organization Events Query (требует авторизации USER)
// ============================================================================

export interface UseOrganizationEventsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  params: OrganizationEventsParams;
}

/**
 * События организатора (предстоящие или прошедшие).
 * GET /api/v1/events/organizations/:id/events
 */
export const useOrganizationEventsQuery = (
  organizationId: string,
  options: UseOrganizationEventsQueryOptions
): UseQueryResult<PublicEventsResponse, Error> => {
  return useQuery<PublicEventsResponse, Error>({
    queryKey: EVENT_QUERY_KEYS.organizationEvents(
      organizationId,
      options.params
    ),
    queryFn: () =>
      eventService.getOrganizationEvents(organizationId, options.params),
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled:
      (options?.enabled ?? true) &&
      Boolean(organizationId) &&
      Boolean(options.params?.status),
  });
};

// ============================================================================
// Featured Events Query (Топовые события)
// ============================================================================

interface UseFeaturedEventsQueryOptions {
  enabled?: boolean;
  /** Количество событий (по умолчанию 10) */
  limit?: number;
  /** Интервал обновления в мс (по умолчанию выключен) */
  refetchInterval?: number | false;
}

/**
 * Хук для получения рекомендуемых/топовых событий
 * Используется в секции «Топовые события» на главной странице
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useFeaturedEventsQuery({ limit: 5 });
 * ```
 */
export const useFeaturedEventsQuery = (
  options?: UseFeaturedEventsQueryOptions
): UseQueryResult<PublicEventsResponse, Error> => {
  const locale = useLocale();

  return useQuery<PublicEventsResponse, Error>({
    queryKey: [...EVENT_QUERY_KEYS.featured(), locale] as const,
    queryFn: () => eventService.getFeaturedEvents(options?.limit ?? 10, locale),
    staleTime: 10 * 60 * 1000, // 10 минут — featured события обновляются реже
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
};

// ============================================================================
// Public Event Detail Query
// ============================================================================

interface UsePublicEventQueryOptions {
  enabled?: boolean;
  /** Загружать по slug (GET by-slug/:slug). Для страниц /events/[slug] и /events/[slug]/register */
  bySlug?: boolean;
  /** Код приглашения — обязателен для доступа к INVITE_ONLY событию по slug. */
  inviteCode?: string;
}

/**
 * Хук для получения детальной информации о мероприятии.
 * При bySlug: true использует GET /public/events/by-slug/:slug.
 */
export const usePublicEventQuery = (
  eventIdOrSlug: string,
  options?: UsePublicEventQueryOptions
): UseQueryResult<PublicEventDetail, Error> => {
  const locale = useLocale();
  // `useEventDetailsQuery` caches the *adapted* `EventDetail` under
  // `detailBySlug(slug)`. This hook returns the *raw* `PublicEventDetail`
  // payload, so it must use a disjoint key namespace — otherwise the two
  // queries collide on the same slug and the registration page overwrites
  // the detail page's cache with a raw shape (missing imageUrl /
  // descriptionBlocks / normalized fields), losing event content on back-nav.
  const inviteCode = options?.inviteCode?.trim() || undefined;
  const queryKey = options?.bySlug
    ? ([
        ...EVENT_QUERY_KEYS.detailBySlug(eventIdOrSlug, inviteCode),
        "raw",
        locale,
      ] as const)
    : ([...EVENT_QUERY_KEYS.detail(eventIdOrSlug), "raw", locale] as const);

  return useQuery<PublicEventDetail, Error>({
    queryKey,
    queryFn: () =>
      options?.bySlug
        ? eventService.getEventBySlug<PublicEventDetail>(
            eventIdOrSlug,
            locale,
            inviteCode
          )
        : eventService.getPublicEventById(eventIdOrSlug, locale),
    staleTime: 10 * 60 * 1000,
    enabled: (options?.enabled ?? true) && Boolean(eventIdOrSlug),
  });
};

// ============================================================================
// Can Register Query
// ============================================================================

interface UseCanRegisterQueryOptions {
  enabled?: boolean;
  /** Personal invitation token from the link; opens PRIVATE events. */
  inviteCode?: string;
}

/**
 * Хук для проверки возможности регистрации на мероприятие
 * Требует авторизации пользователя
 */
export const useCanRegisterQuery = (
  eventId: string,
  options?: UseCanRegisterQueryOptions
): UseQueryResult<CanRegisterResponse, Error> => {
  return useQuery<CanRegisterResponse, Error>({
    queryKey: [...EVENT_QUERY_KEYS.canRegister(eventId), options?.inviteCode],
    queryFn: () => eventService.canRegister(eventId, options?.inviteCode),
    staleTime: 60 * 1000, // 1 минута — состояние регистрации может меняться
    enabled: (options?.enabled ?? true) && Boolean(eventId),
  });
};

// ============================================================================
// Invalidation Helpers
// ============================================================================

export const useInvalidateEvents = () => {
  const queryClient = useQueryClient();

  return {
    /** Инвалидирует все запросы событий */
    invalidateAll: () =>
      queryClient.invalidateQueries({
        queryKey: EVENT_QUERY_KEYS.all,
      }),

    /** Инвалидирует списки событий */
    invalidateLists: () =>
      queryClient.invalidateQueries({
        queryKey: EVENT_QUERY_KEYS.lists(),
      }),

    /** Инвалидирует детали конкретного события */
    invalidateDetail: (eventId: string) =>
      queryClient.invalidateQueries({
        queryKey: EVENT_QUERY_KEYS.detail(eventId),
      }),

    /** Инвалидирует проверку возможности регистрации */
    invalidateCanRegister: (eventId: string) =>
      queryClient.invalidateQueries({
        queryKey: EVENT_QUERY_KEYS.canRegister(eventId),
      }),
  };
};

// ============================================================================
// Prefetch Helpers
// ============================================================================

export const usePrefetchEvent = () => {
  const queryClient = useQueryClient();

  return {
    /** Предзагрузка детальной информации о событии */
    prefetchEventDetail: (eventId: string) =>
      queryClient.prefetchQuery({
        queryKey: EVENT_QUERY_KEYS.detail(eventId),
        queryFn: () => eventService.getPublicEventById(eventId),
        staleTime: 10 * 60 * 1000,
      }),
  };
};

// ============================================================================
// Re-export types and keys
// ============================================================================

export { EVENT_QUERY_KEYS };
export type {
  PublicEventsParams,
  PublicEventsResponse,
  PublicEventDetail,
  PublicEvent,
  CanRegisterResponse,
  EventPaymentType,
} from "@shared/api/eventService";

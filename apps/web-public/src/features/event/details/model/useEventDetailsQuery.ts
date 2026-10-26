import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@eventflow/i18n/react";

import { adaptApiEventToEventDetail } from "@entities/event/lib";
import { eventService, EVENT_QUERY_KEYS } from "@shared/api/eventService";

import type { EventDetail } from "@entities/event";
import type { ApiError } from "@shared/lib";
import type {
  QueryClient,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

export const eventDetailsQueryKey = (slug: string) =>
  EVENT_QUERY_KEYS.detailBySlug(slug);

interface UseEventDetailsQueryOptions {
  slug: string;
  inviteCode?: string;
  enabled?: boolean;
  refetchIntervalMs?: number;
  initialData?: EventDetail;
  /** При авторизации передать 0, чтобы сразу запросить событие с myRegistration */
  staleTime?: number;
}

export function useEventDetailsQuery({
  slug,
  inviteCode,
  enabled = true,
  refetchIntervalMs,
  initialData,
  staleTime = 1000 * 60 * 5,
}: UseEventDetailsQueryOptions): UseQueryResult<EventDetail, ApiError> {
  const { locale: uiLocale, t } = useI18n();
  const localeParam =
    uiLocale === "ru" || uiLocale === "uz" || uiLocale === "en"
      ? uiLocale
      : undefined;

  const queryOptions: UseQueryOptions<EventDetail, ApiError> = {
    // Включаем locale в queryKey, чтобы переключение языка интерфейса
    // вызывало рефетч с правильно локализованным ответом backend.
    queryKey: [
      ...EVENT_QUERY_KEYS.detailBySlug(slug, inviteCode),
      localeParam ?? "default",
    ] as const,
    queryFn: async () => {
      const raw = await eventService.getEventBySlug<Record<string, unknown>>(
        slug,
        localeParam,
        inviteCode,
      );
      return adaptApiEventToEventDetail(raw, t) as EventDetail;
    },
    enabled: Boolean(slug) && enabled,
    staleTime,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  };

  if (refetchIntervalMs && enabled) {
    queryOptions.refetchInterval = refetchIntervalMs;
  }

  // Используем placeholderData вместо initialData: при смене локали queryKey
  // меняется и сервер уже отрендерил initialEvent под новую локаль; placeholder
  // показывает его мгновенно, но кэш всё равно перезаполнится свежим ответом
  // backend, так что хук никогда не отдаст устаревшую (старую) локаль.
  if (initialData) {
    queryOptions.placeholderData = initialData;
  }

  return useQuery(queryOptions);
}

export function prefetchEventDetails(
  queryClient: QueryClient,
  slug: string
): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey: eventDetailsQueryKey(slug),
    queryFn: () => eventService.getEventBySlug<EventDetail>(slug),
    staleTime: 1000 * 60 * 5,
  });
}

export function invalidateEventDetailsQuery(
  queryClient: QueryClient,
  slug: string
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: eventDetailsQueryKey(slug),
  });
}

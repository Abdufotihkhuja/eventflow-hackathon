/**
 * TanStack Query хуки для публичной статистики платформы
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useLocale } from "@eventflow/i18n/react";

import {
  publicStatsService,
  PUBLIC_STATS_QUERY_KEYS,
  type PlatformStats,
  type OrganizationPublicStats,
} from "@shared/api/publicStatsService";

/**
 * Хук для получения публичной статистики платформы
 * GET /api/v1/public/stats
 * Не требует авторизации — идеально для лендинга
 *
 * @example
 * ```tsx
 * const { data: stats, isLoading } = usePlatformStatsQuery();
 *
 * // Доступ к данным:
 * // stats.activeEvents.value — количество активных событий
 * // stats.newParticipants.changePercent — % роста участников
 * // stats.registrationConversion.value — конверсия регистрации
 * // stats.totalOrganizations — всего организаций
 * ```
 */
export const usePlatformStatsQuery = (options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}): UseQueryResult<PlatformStats, Error> => {
  return useQuery<PlatformStats, Error>({
    queryKey: PUBLIC_STATS_QUERY_KEYS.platformStats,
    queryFn: () => publicStatsService.getPlatformStats(),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 60_000, // 1 минута — публичные данные не меняются часто
    refetchInterval: options?.refetchInterval ?? 120_000, // обновление каждые 2 минуты
  });
};

/**
 * Хук для получения публичной статистики организации
 * GET /api/v1/public/organizations/:id/stats
 *
 * @example
 * ```tsx
 * const { data: orgStats } = useOrganizationPublicStatsQuery("org-123");
 * ```
 */
export const useOrganizationPublicStatsQuery = (
  orgId: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
): UseQueryResult<OrganizationPublicStats, Error> => {
  const locale = useLocale();

  return useQuery<OrganizationPublicStats, Error>({
    queryKey: [...PUBLIC_STATS_QUERY_KEYS.organizationStats(orgId), locale],
    queryFn: () => publicStatsService.getOrganizationStats(orgId, locale),
    enabled: (options?.enabled ?? true) && Boolean(orgId),
    staleTime: options?.staleTime ?? 60_000,
  });
};

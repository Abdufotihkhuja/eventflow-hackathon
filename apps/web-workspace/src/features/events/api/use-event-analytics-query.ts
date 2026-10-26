import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { eventAnalyticsService } from '@api/services'
import type { EventAnalyticsQuery } from '@api/services'

export const eventAnalyticsKeys = {
  all: (eventId: string) => ['events', eventId, 'analytics'] as const,
  detail: (eventId: string, params: EventAnalyticsQuery | undefined) =>
    [...eventAnalyticsKeys.all(eventId), normalizeParams(params)] as const,
}

/**
 * Hook for the Analytics tab on an event detail page.
 *
 * Uses `keepPreviousData` so toggling filters keeps the current charts on-screen while the next
 * page loads — same UX as the participants list.
 */
export function useEventAnalyticsQuery(
  eventId: string,
  params?: EventAnalyticsQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: eventAnalyticsKeys.detail(eventId, params),
    queryFn: () => eventAnalyticsService.getAnalytics(eventId, params),
    enabled: !!eventId && (options?.enabled ?? true),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

function normalizeParams(params: EventAnalyticsQuery | undefined) {
  if (!params) return {}
  // Stable key shape — strip undefined so React Query cache hits across renders.
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  )
}

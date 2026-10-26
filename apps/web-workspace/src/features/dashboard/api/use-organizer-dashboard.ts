import { useQuery } from '@tanstack/react-query'
import { organizationsService } from '@api/services'
import type { GetDashboardActivityParams } from '@api/services'

export const ORGANIZER_DASHBOARD_STATS_KEY = ['organizations', 'dashboard', 'stats'] as const
export const ORGANIZER_DASHBOARD_ACTIVITY_KEY = ['organizations', 'dashboard', 'activity'] as const

export function useOrganizerDashboardStatsQuery(enabled = true) {
  return useQuery({
    queryKey: ORGANIZER_DASHBOARD_STATS_KEY,
    queryFn: () => organizationsService.getDashboardStats(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useOrganizerDashboardActivityQuery(
  params?: GetDashboardActivityParams,
  enabled = true
) {
  return useQuery({
    queryKey: [...ORGANIZER_DASHBOARD_ACTIVITY_KEY, params],
    queryFn: () => organizationsService.getDashboardActivity(params),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled,
  })
}

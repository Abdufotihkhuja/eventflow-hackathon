import { useQuery } from '@tanstack/react-query'
import { statsService } from '@api/services'
import type { StatsParams } from '@api/services'

export const useMonthlyStatsQuery = (params?: StatsParams) => {
  return useQuery({
    queryKey: ['stats', 'monthly', params],
    queryFn: () => statsService.getMonthlyStats(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

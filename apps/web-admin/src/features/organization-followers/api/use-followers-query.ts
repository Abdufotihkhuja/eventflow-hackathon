import { useQuery } from '@tanstack/react-query'
import { organizationsService } from '@api/services'
import type { GetFollowersParams } from '@api/services'

export const FOLLOWERS_QUERY_KEY = ['organizations', 'followers'] as const
export const FOLLOWERS_STATS_QUERY_KEY = ['organizations', 'followers', 'stats'] as const

export function useFollowersQuery(params?: GetFollowersParams) {
  return useQuery({
    queryKey: [...FOLLOWERS_QUERY_KEY, params],
    queryFn: () => organizationsService.getFollowers(params),
    staleTime: 2 * 60 * 1000,
  })
}

export function useFollowersStatsQuery() {
  return useQuery({
    queryKey: FOLLOWERS_STATS_QUERY_KEY,
    queryFn: () => organizationsService.getFollowersStats(),
    staleTime: 2 * 60 * 1000,
  })
}

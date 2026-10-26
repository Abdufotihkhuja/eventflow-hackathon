import { useQuery } from '@tanstack/react-query'
import { organizationsService } from '@api/services'
import type { GetContactsParams } from '@api/services'

export const CONTACTS_QUERY_KEY = ['organizations', 'contacts'] as const
export const CONTACTS_STATS_QUERY_KEY = ['organizations', 'contacts', 'stats'] as const

export function useContactsQuery(params?: GetContactsParams) {
  return useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, params],
    queryFn: () => organizationsService.getContacts(params),
    staleTime: 2 * 60 * 1000,
  })
}

export function useContactsStatsQuery() {
  return useQuery({
    queryKey: CONTACTS_STATS_QUERY_KEY,
    queryFn: () => organizationsService.getContactsStats(),
    staleTime: 2 * 60 * 1000,
  })
}

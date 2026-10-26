import { useQuery } from '@tanstack/react-query'
import { organizationsService } from '@api/services'

export const CONTACT_DETAIL_QUERY_KEY = ['organizations', 'contacts', 'detail'] as const

export function useContactQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...CONTACT_DETAIL_QUERY_KEY, id],
    queryFn: () => organizationsService.getContact(id!),
    enabled: Boolean(id && enabled),
    staleTime: 1 * 60 * 1000,
  })
}

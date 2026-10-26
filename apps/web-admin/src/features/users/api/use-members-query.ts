/**
 * Хук для получения списка сотрудников организации
 */

import { useQuery } from '@tanstack/react-query'

import { organizationsService } from '@api/services'
import type { GetMembersParams } from '@api/services'

export const MEMBERS_QUERY_KEY = 'organization-members'

export function useMembersQuery(params?: GetMembersParams) {
  return useQuery({
    queryKey: [MEMBERS_QUERY_KEY, params],
    queryFn: () => organizationsService.getMembers(params),
    staleTime: 1000 * 60 * 2, // 2 минуты
  })
}

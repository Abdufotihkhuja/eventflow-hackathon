/**
 * Хук для получения ролей организации
 */

import { useQuery } from '@tanstack/react-query'

import { organizationsService } from '@api/services'

export const ROLES_QUERY_KEY = 'organization-roles'

export function useRolesQuery() {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: () => organizationsService.getRoles(),
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

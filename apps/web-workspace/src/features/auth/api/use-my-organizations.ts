import { useQuery } from '@tanstack/react-query'

import { getAccessToken } from '@api/config'
import { meService, type MyOrganizationsResponse } from '@api/index'

export const MY_ORGANIZATIONS_QUERY_KEY = ['me', 'organizations'] as const

/**
 * Список активных членств текущего пользователя в организациях.
 * Используется в переключателе организаций (header) для >1 организации.
 */
export function useMyOrganizations(enabled = true) {
  const accessToken = getAccessToken()

  return useQuery<MyOrganizationsResponse>({
    queryKey: MY_ORGANIZATIONS_QUERY_KEY,
    queryFn: () => meService.getMyOrganizations(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    enabled: enabled && !!accessToken,
  })
}

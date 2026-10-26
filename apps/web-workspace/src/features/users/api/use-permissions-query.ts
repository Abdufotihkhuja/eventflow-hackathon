/**
 * Хук для получения списка всех доступных прав
 * API: GET /api/v1/permissions
 */

import { useQuery } from '@tanstack/react-query'

import { organizationsService } from '@api/services'

export const PERMISSIONS_QUERY_KEY = 'permissions'

export function usePermissionsQuery() {
  return useQuery({
    queryKey: [PERMISSIONS_QUERY_KEY],
    queryFn: () => organizationsService.getPermissions(),
    staleTime: 1000 * 60 * 10, // 10 minutes - права меняются редко
  })
}

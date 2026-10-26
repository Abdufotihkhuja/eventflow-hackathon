/**
 * Хук для обновления индивидуальных прав сотрудника
 * API: PATCH /api/v1/organizations/members/{memberId}/permissions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { organizationsService } from '@api/services'
import type { UpdateMemberPermissionsRequest } from '@api/services'
import {
  CURRENT_USER_QUERY_KEY,
  MEMBER_PERMISSIONS_QUERY_KEY,
  MEMBER_PROFILE_QUERY_KEY,
} from '@features/profile'

import { MEMBERS_QUERY_KEY } from './use-members-query'

type UpdatePermissionsParams = {
  memberId: string
  data: UpdateMemberPermissionsRequest
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, data }: UpdatePermissionsParams) =>
      organizationsService.updateMemberPermissions(memberId, data),
    onSuccess: (_, variables) => {
      // Инвалидируем список сотрудников
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] })
      // Инвалидируем конкретного сотрудника
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY, variables.memberId] })
      // Если редактировали текущего сотрудника, sidebar/page guards должны
      // получить fresh effectivePermissions без hard refresh.
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: MEMBER_PERMISSIONS_QUERY_KEY })
    },
  })
}

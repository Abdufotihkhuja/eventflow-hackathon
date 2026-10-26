/**
 * Хук для обновления индивидуальных прав сотрудника
 * API: PATCH /api/v1/organizations/members/{memberId}/permissions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { organizationsService } from '@api/services'
import type { UpdateMemberPermissionsRequest } from '@api/services'

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
    },
  })
}

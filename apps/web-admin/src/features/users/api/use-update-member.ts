/**
 * Хук для обновления данных сотрудника
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { organizationsService } from '@api/services'
import type { UpdateMemberRequest } from '@api/services'

import { MEMBERS_QUERY_KEY } from './use-members-query'

type UpdateMemberParams = {
  memberId: string
  data: UpdateMemberRequest
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, data }: UpdateMemberParams) =>
      organizationsService.updateMember(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] })
      toast.success('Данные сотрудника обновлены')
    },
    onError: () => {
      toast.error('Не удалось обновить данные')
    },
  })
}

/**
 * Хук для обновления данных сотрудника
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
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
  const t = useT()

  return useMutation({
    mutationFn: ({ memberId, data }: UpdateMemberParams) =>
      organizationsService.updateMember(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] })
      toast.success(t('toasts.users.updated'))
    },
    onError: () => {
      toast.error(t('toasts.users.updateError'))
    },
  })
}

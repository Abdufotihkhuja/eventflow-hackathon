/**
 * Хук для удаления сотрудника
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { organizationsService } from '@api/services'

import { MEMBERS_QUERY_KEY } from './use-members-query'

export function useDeleteMember() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (memberId: string) => organizationsService.deleteMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] })
      toast.success(t('toasts.users.deleted'))
    },
    onError: () => {
      toast.error(t('toasts.users.deleteError'))
    },
  })
}

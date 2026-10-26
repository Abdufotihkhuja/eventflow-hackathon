/**
 * Хук для удаления сотрудника
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { organizationsService } from '@api/services'

import { MEMBERS_QUERY_KEY } from './use-members-query'

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) => organizationsService.deleteMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] })
      toast.success('Сотрудник удалён')
    },
    onError: () => {
      toast.error('Не удалось удалить сотрудника')
    },
  })
}

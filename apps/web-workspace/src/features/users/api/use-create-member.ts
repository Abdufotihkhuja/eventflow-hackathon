/**
 * Хук для создания нового сотрудника
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { organizationsService } from '@api/services'
import type { CreateMemberRequest } from '@api/services'

import { MEMBERS_QUERY_KEY } from './use-members-query'

export function useCreateMember() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (data: CreateMemberRequest) => organizationsService.createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] })
      toast.success(t('toasts.users.created'))
    },
    onError: () => {
      toast.error(t('toasts.users.createError'))
    },
  })
}

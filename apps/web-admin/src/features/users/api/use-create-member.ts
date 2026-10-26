/**
 * Хук для создания нового сотрудника
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { workspaceSdk } from '@api/sdk'
import type { CreateMemberRequest } from '@api/services'

import { MEMBERS_QUERY_KEY } from './use-members-query'

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMemberRequest) =>
      workspaceSdk.invites.create({
        email: data.email,
        roleId: data.roleId,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        department: data.department,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] })
      toast.success('Приглашение успешно отправлено')
    },
    onError: () => {
      toast.error('Не удалось отправить приглашение')
    },
  })
}

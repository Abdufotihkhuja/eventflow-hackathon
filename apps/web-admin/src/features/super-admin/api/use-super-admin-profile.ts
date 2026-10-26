/**
 * Хуки профиля супер-админа (Super Admin)
 * Uses account-centric session bootstrap plus POST /super-admin/admins
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'

export const SUPER_ADMIN_ME_QUERY_KEY = ['super-admin', 'me'] as const

/** Текущий супер-админ через account-centric session model */
export function useSuperAdminMe() {
  return useQuery({
    queryKey: SUPER_ADMIN_ME_QUERY_KEY,
    queryFn: () => superAdminService.getMe(),
    staleTime: 5 * 60 * 1000,
  })
}

type CreateSuperAdminRequest = {
  email: string
  password: string
  name: string
}

/** POST /super-admin/admins — создать супер-админа */
export function useCreateSuperAdmin() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSuperAdminRequest) => superAdminService.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPER_ADMIN_ME_QUERY_KEY })
      toast.success(t('admin.toasts.superAdminCreated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.superAdminCreateError'))
    },
  })
}

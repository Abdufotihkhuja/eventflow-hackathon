/**
 * Хуки маски доступа организации (тонкое управление супер-админа).
 * GET/PUT /api/v1/super-admin/organizations/:orgId/access-mask.
 * Мутация НЕ тостит ошибку — панель показывает её инлайн; успех = toast + рефетч.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { accessMaskService, type SetAccessMaskRequest } from '@api/services'

export const ACCESS_MASK_QUERY_KEY = ['super-admin', 'access-mask'] as const

export function useAccessMask(orgId: string | null) {
  return useQuery({
    queryKey: [...ACCESS_MASK_QUERY_KEY, orgId],
    queryFn: () => accessMaskService.getMask(orgId!),
    enabled: !!orgId,
    staleTime: 15 * 1000,
  })
}

export function useSetAccessMask(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SetAccessMaskRequest) =>
      accessMaskService.setMask(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ACCESS_MASK_QUERY_KEY, orgId] })
      toast.success(t('admin.accessMask.saveSuccess'))
    },
  })
}

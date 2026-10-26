/**
 * Хуки для админ-управления приглашениями организации (organization invites).
 * Эндпоинты: POST/GET/DELETE /organizations/invites, POST .../resend.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { invitesService } from '@api/services'
import type { CreateInviteRequest } from '@api/services'

export const ORG_INVITES_QUERY_KEY = ['organization', 'invites'] as const

/** Список pending-приглашений организации */
export function usePendingInvites(enabled = true) {
  return useQuery({
    queryKey: [...ORG_INVITES_QUERY_KEY, 'PENDING'],
    queryFn: () => invitesService.list('PENDING'),
    enabled,
  })
}

/**
 * Приглашения, от которых отказались. Показываем отдельно: организатору важно
 * знать, что ответ был, и увидеть причину, а не гадать, почему человек молчит.
 */
export function useDeclinedInvites(enabled = true) {
  return useQuery({
    queryKey: [...ORG_INVITES_QUERY_KEY, 'DECLINED'],
    queryFn: () => invitesService.list('DECLINED'),
    enabled,
  })
}

/** Создать приглашение сотрудника */
export function useCreateInvite() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (data: CreateInviteRequest) => invitesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_INVITES_QUERY_KEY })
      toast.success(t('toasts.users.created'))
    },
    // Ошибки (409 и т.п.) обрабатываются на стороне вызывающего кода.
    meta: { skipToast: true },
  })
}

/** Повторно отправить приглашение */
export function useResendInvite() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (inviteId: string) => invitesService.resend(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_INVITES_QUERY_KEY })
      toast.success(t('toasts.users.inviteResent'))
    },
    onError: () => {
      toast.error(t('toasts.users.inviteResendError'))
    },
  })
}

/** Отозвать приглашение */
export function useRevokeInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (inviteId: string) => invitesService.revoke(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_INVITES_QUERY_KEY })
    },
  })
}

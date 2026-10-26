import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { eventsService } from '@api/services'
import type { ApiError } from '@api/types'

export const inviteLinkKeys = {
  all: ['events', 'invite-link'] as const,
  event: (eventId: string) => [...inviteLinkKeys.all, eventId] as const,
}

/**
 * Ссылка и код приглашения (только для событий INVITE_ONLY).
 */
export function useInviteLinkQuery(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: inviteLinkKeys.event(eventId),
    queryFn: () => eventsService.getInviteLink(eventId),
    enabled: !!eventId && enabled,
    staleTime: 60_000,
  })
}

/**
 * Отправить приглашение на email (INVITE_ONLY).
 */
export function useSendInvitation(eventId: string) {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (email: string) => eventsService.sendInvitation(eventId, { email }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: inviteLinkKeys.event(eventId) })
      toast.success(data.message || t('toasts.events.inviteSent'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.inviteSendError'))
    },
  })
}

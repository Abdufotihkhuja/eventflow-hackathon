import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { eventsService } from '@api/services'
import type { ApiError } from '@api/types'

export const privateInvitationKeys = {
  all: ['events', 'private-invitations'] as const,
  event: (eventId: string) => [...privateInvitationKeys.all, eventId] as const,
}

/** Personal invitations of a PRIVATE event, newest first. */
export function usePrivateInvitationsQuery(eventId: string) {
  return useQuery({
    queryKey: privateInvitationKeys.event(eventId),
    queryFn: () => eventsService.getPrivateInvitations(eventId),
    enabled: !!eventId,
  })
}

/** Emails personal links; toasts how many went out and who was skipped. */
export function useSendPrivateInvitations(eventId: string) {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (emails: string[]) => eventsService.sendPrivateInvitations(eventId, emails),
    onSuccess: ({ sent, skipped }) => {
      void queryClient.invalidateQueries({ queryKey: privateInvitationKeys.event(eventId) })
      if (sent.length) {
        toast.success(t('events.privateInvitations.sentToast', { count: sent.length }))
      }
      if (skipped.length) {
        toast.info(
          t('events.privateInvitations.skippedToast', {
            emails: skipped.map(s => s.email).join(', '),
          })
        )
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.inviteSendError'))
    },
  })
}

/** Resend (new link) or revoke a single invitation. */
export function usePrivateInvitationAction(eventId: string) {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resend' | 'revoke' }) =>
      action === 'resend'
        ? eventsService.resendPrivateInvitation(eventId, id)
        : eventsService.revokePrivateInvitation(eventId, id),
    onSuccess: (_data, { action }) => {
      void queryClient.invalidateQueries({ queryKey: privateInvitationKeys.event(eventId) })
      toast.success(
        t(
          action === 'resend'
            ? 'events.privateInvitations.resentToast'
            : 'events.privateInvitations.revokedToast'
        )
      )
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.inviteSendError'))
    },
  })
}

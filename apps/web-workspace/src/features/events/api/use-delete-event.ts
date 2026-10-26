import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'

import { toast } from 'sonner'

import { eventsService } from '@api/services'

import { eventsKeys } from './use-events-query'

export function useDeleteEvent() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all })
      toast.success(t('toasts.events.deleted'))
    },
    onError: () => {
      toast.error(t('toasts.events.deleteError'))
    },
  })
}

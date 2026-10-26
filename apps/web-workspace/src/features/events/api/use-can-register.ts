import { useQuery } from '@tanstack/react-query'

import { publicEventsService } from '@api/services'

export const canRegisterKeys = {
  all: ['public', 'can-register'] as const,
  event: (eventId: string) => [...canRegisterKeys.all, eventId] as const,
}

/**
 * Проверка возможности регистрации на событие (публичный endpoint).
 * Для INVITE_ONLY возвращает requiresInviteCode: true — тогда на форме нужен ввод кода.
 */
export function useCanRegisterQuery(eventId: string, enabled = true) {
  return useQuery({
    queryKey: canRegisterKeys.event(eventId),
    queryFn: () => publicEventsService.canRegister(eventId),
    enabled: !!eventId && enabled,
    staleTime: 60_000,
  })
}

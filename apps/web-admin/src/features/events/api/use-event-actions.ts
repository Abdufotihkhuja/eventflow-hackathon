import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'

import { eventsService } from '@api/services'
import type { ApiError } from '@api/types'

import { inviteLinkKeys } from './use-invite-link'
import { eventsKeys } from './use-events-query'

/**
 * Хук для отправки события на модерацию
 */
export function useSubmitEventForReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.submitForReview(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success('Мероприятие отправлено на модерацию')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отправить на модерацию')
    },
  })
}

/**
 * Хук для публикации события
 */
export function usePublishEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.publishEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success('Мероприятие опубликовано')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось опубликовать мероприятие')
    },
  })
}

/**
 * Хук для отмены события
 */
export function useCancelEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.cancelEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success('Мероприятие отменено')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отменить мероприятие')
    },
  })
}

/**
 * Хук для завершения события
 */
export function useCompleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.completeEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success('Мероприятие завершено')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось завершить мероприятие')
    },
  })
}

/**
 * Хук для регенерации кода приглашения
 */
export function useRegenerateInviteCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.regenerateInviteCode(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: inviteLinkKeys.event(eventId) })
      toast.success('Код приглашения обновлён. Предыдущий код больше не действует.')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить код приглашения')
    },
  })
}

/**
 * Хук для check-in участника
 */
export function useCheckIn(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (registrationId: string) => eventsService.checkIn(eventId, { registrationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'attendance'] })
      toast.success('Check-in выполнен')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось выполнить check-in')
    },
  })
}

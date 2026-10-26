import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'

import { toast } from 'sonner'

import { eventsService } from '@api/services'
import type { ApiError } from '@api/types'

import { inviteLinkKeys } from './use-invite-link'
import { eventsKeys } from './use-events-query'
import type { Event } from '@entities/event'

/**
 * Хук для отправки события на модерацию
 */
export function useSubmitEventForReview() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.submitForReview(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success(t('toasts.events.submittedForReview'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.submitForReviewError'))
    },
  })
}

/**
 * Хук для публикации события
 */
export function usePublishEvent() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.publishEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success(t('toasts.events.published'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.publishError'))
    },
  })
}

/**
 * Хук для отмены события
 */
export function useCancelEvent() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.cancelEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success(t('toasts.events.cancelled'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.cancelError'))
    },
  })
}

/**
 * Хук для завершения события
 */
export function useCompleteEvent() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.completeEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success(t('toasts.events.completed'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.completeError'))
    },
  })
}

export function useDuplicateEvent() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (event: Event) =>
      eventsService.duplicateEvent(event, {
        title: `${event.title} ${t('events.duplicate.titleSuffix')}`,
        titleSuffix: t('events.duplicate.titleSuffix'),
      }),
    onSuccess: duplicatedEvent => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
      toast.success(t('toasts.events.duplicated'))
      return duplicatedEvent
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.duplicateError'))
    },
  })
}

/**
 * Хук для регенерации кода приглашения
 */
export function useRegenerateInviteCode() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.regenerateInviteCode(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: inviteLinkKeys.event(eventId) })
      toast.success(t('toasts.events.inviteCodeRegenerated'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.inviteCodeRegenerateError'))
    },
  })
}

/**
 * Хук для генерации сертификатов
 * @param body.registrationIds — выбранные регистрации; если не передано — генерируются для всех подходящих
 * @param body.onlyAttended — только для посетивших (по умолчанию true при «Выдать всем»)
 */
export function useGenerateCertificates() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: ({
      eventId,
      registrationIds,
      recipientIds,
      onlyAttended,
      recipientRole,
      recipientRoleId,
      recipientRoleIds,
      roleId,
      roleCode,
      scope,
      templateId,
      forceRegenerate,
      ineligiblePolicy,
    }: {
      eventId: string
      registrationIds?: string[]
      recipientIds?: string[]
      onlyAttended?: boolean
      recipientRole?: 'PARTICIPANT' | 'SPEAKER' | 'MENTOR'
      recipientRoleId?: string
      recipientRoleIds?: string[]
      roleId?: string
      roleCode?: string
      scope?: 'ROLE' | 'ALL_ELIGIBLE'
      templateId?: string
      forceRegenerate?: boolean
      ineligiblePolicy?: 'EXCLUDE' | 'INCLUDE'
    }) =>
      eventsService.generateCertificates(eventId, {
        registrationIds,
        recipientIds,
        onlyAttended,
        recipientRole,
        recipientRoleId,
        recipientRoleIds,
        roleId,
        roleCode,
        scope,
        templateId,
        forceRegenerate,
        ineligiblePolicy,
      }),
    onSuccess: (result, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ['event-certificates', 'event', eventId],
      })
      if (result.status === 'processing') {
        toast.message(result.message)
        return
      }
      toast.success(t('toasts.events.certificatesGenerated'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.certificatesGenerateError'))
    },
  })
}

/**
 * Хук для check-in участника
 */
export function useCheckIn(eventId: string) {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (registrationId: string) => eventsService.checkIn(eventId, { registrationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'attendance'] })
      toast.success(t('toasts.events.checkInCompleted'))
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toasts.events.checkInError'))
    },
  })
}

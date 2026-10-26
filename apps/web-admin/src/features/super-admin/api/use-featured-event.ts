/**
 * Хук для управления топовыми событиями (Featured Events)
 * Endpoint: PATCH /api/v1/super-admin/events/{eventId}/featured
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type { AdminEvent } from '@api/services/superAdmin.types'

import { ADMIN_EVENTS_QUERY_KEY, ADMIN_EVENT_QUERY_KEY } from './use-admin-events'

// ================================
// Mutation: переключить статус топового события
// ================================

export function useFeaturedEventMutation() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => superAdminService.toggleFeaturedEvent(eventId),

    // Оптимистичное обновление для мгновенной реакции UI
    onMutate: async eventId => {
      // Отменяем текущие запросы для этого события
      await queryClient.cancelQueries({ queryKey: [...ADMIN_EVENT_QUERY_KEY, eventId] })
      await queryClient.cancelQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })

      // Сохраняем предыдущее состояние для отката
      const previousEvent = queryClient.getQueryData<AdminEvent>([
        ...ADMIN_EVENT_QUERY_KEY,
        eventId,
      ])

      // Оптимистично обновляем кэш отдельного события
      if (previousEvent) {
        queryClient.setQueryData<AdminEvent>([...ADMIN_EVENT_QUERY_KEY, eventId], {
          ...previousEvent,
          isFeatured: !previousEvent.isFeatured,
        })
      }

      // Оптимистично обновляем список событий
      queryClient.setQueriesData<{ data: AdminEvent[]; total: number }>(
        { queryKey: ADMIN_EVENTS_QUERY_KEY },
        old => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map(event =>
              event.id === eventId ? { ...event, isFeatured: !event.isFeatured } : event
            ),
          }
        }
      )

      return { previousEvent }
    },

    onSuccess: updatedEvent => {
      // Показываем toast с учётом нового статуса
      if (updatedEvent.isFeatured) {
        toast.success(t('admin.toasts.eventFeatured'), {
          description: t('admin.toasts.eventFeaturedDescription'),
        })
      } else {
        toast.success(t('admin.toasts.eventUnfeatured'), {
          description: t('admin.toasts.eventUnfeaturedDescription'),
        })
      }

      // Инвалидируем queries для получения актуальных данных с сервера
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_EVENT_QUERY_KEY, updatedEvent.id] })
    },

    onError: (_error, eventId, context) => {
      // Откатываем оптимистичное обновление в случае ошибки
      if (context?.previousEvent) {
        queryClient.setQueryData([...ADMIN_EVENT_QUERY_KEY, eventId], context.previousEvent)
      }

      // Инвалидируем для получения актуального состояния
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })

      toast.error(t('admin.toasts.eventFeaturedToggleError'), {
        description: t('admin.toasts.retryAgain'),
      })
    },
  })
}

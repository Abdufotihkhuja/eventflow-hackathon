/**
 * Хуки для управления событиями (Super Admin)
 * Endpoints:
 * - GET /api/v1/super-admin/events
 * - GET /api/v1/super-admin/events/{eventId}
 * - GET /api/v1/super-admin/events/pending
 * - POST /api/v1/super-admin/events/{eventId}/approve
 * - POST /api/v1/super-admin/events/{eventId}/reject
 * - PATCH /api/v1/super-admin/events/{eventId}
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type {
  AdminEvent,
  GetAdminEventsParams,
  GetAdminEventsResponse,
  UpdateAdminEventRequest,
  SetAdminEventStatusRequest,
} from '@api/services/superAdmin.types'
import { normalizeBlockNoteTables } from '@shared/lib'

import { getApiErrorCode, getApiErrorMessage } from './api-error'
import { SYSTEM_STATS_QUERY_KEY } from './use-system-stats'

export const ADMIN_EVENTS_QUERY_KEY = ['super-admin', 'events'] as const
export const ADMIN_EVENT_QUERY_KEY = ['super-admin', 'event'] as const
export const PENDING_EVENTS_QUERY_KEY = [
  'super-admin',
  'events',
  'pending',
] as const

// ================================
// Query: одно событие по ID
// ================================

export function useAdminEventQuery(eventId: string) {
  return useQuery<AdminEvent>({
    queryKey: [...ADMIN_EVENT_QUERY_KEY, eventId],
    queryFn: () => superAdminService.getEvent(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    // Нормализуем таблицы в описании
    select: (data) => {
      if (data && Array.isArray(data.description)) {
        return {
          ...data,
          description: normalizeBlockNoteTables(data.description),
        }
      }
      return data
    },
  })
}

// ================================
// Query: список всех событий
// ================================

export function useAdminEvents(params?: GetAdminEventsParams) {
  return useQuery<GetAdminEventsResponse>({
    queryKey: [...ADMIN_EVENTS_QUERY_KEY, params],
    queryFn: () => superAdminService.getEvents(params),
    staleTime: 30 * 1000,
    // Нормализуем таблицы в описаниях всех событий
    select: (data) => {
      if (!data) return data

      return {
        ...data,
        data: data.data.map((event) => ({
          ...event,
          description: Array.isArray(event.description)
            ? normalizeBlockNoteTables(event.description)
            : event.description,
        })),
      }
    },
  })
}

// ================================
// Query: события на модерации
// ================================

export function usePendingEvents(params?: GetAdminEventsParams) {
  return useQuery<GetAdminEventsResponse>({
    queryKey: [...PENDING_EVENTS_QUERY_KEY, params],
    queryFn: () => superAdminService.getPendingEvents(params),
    staleTime: 30 * 1000,
    // Нормализуем таблицы в описаниях всех событий
    select: (data) => {
      if (!data) return data

      return {
        ...data,
        data: data.data.map((event) => ({
          ...event,
          description: Array.isArray(event.description)
            ? normalizeBlockNoteTables(event.description)
            : event.description,
        })),
      }
    },
  })
}

// ================================
// Mutation: одобрить мероприятие (опубликовать)
// ================================

export function useApproveEvent() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => superAdminService.approveEvent(eventId),
    onSuccess: async (_data, eventId) => {
      // Принудительно рефетчим все events queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY }),
        queryClient.refetchQueries({ queryKey: PENDING_EVENTS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...ADMIN_EVENT_QUERY_KEY, eventId],
        }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ])
      toast.success(t('admin.toasts.eventApproved'))
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, t('admin.toasts.eventApproveError')),
      )
    },
  })
}

// ================================
// Mutation: отклонить мероприятие (вернуть в черновик)
// ================================

export function useRejectEvent() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason?: string }) =>
      superAdminService.rejectEvent(eventId, { reason }),
    onSuccess: async (_data, variables) => {
      // Принудительно рефетчим все events queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY }),
        queryClient.refetchQueries({ queryKey: PENDING_EVENTS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...ADMIN_EVENT_QUERY_KEY, variables.eventId],
        }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ])
      toast.success(t('admin.toasts.eventRejected'))
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t('admin.toasts.eventRejectError')))
    },
  })
}

// ================================
// Mutation: принудительно изменить статус события
// ================================

export function useSetAdminEventStatus() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string
      data: SetAdminEventStatusRequest
    }) => superAdminService.setEventStatus(eventId, data),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY }),
        queryClient.refetchQueries({ queryKey: PENDING_EVENTS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...ADMIN_EVENT_QUERY_KEY, variables.eventId],
        }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ])
      toast.success(t('admin.toasts.eventStatusChanged'))
    },
    onError: async (error, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...ADMIN_EVENT_QUERY_KEY, variables.eventId],
      })
      // Про устаревшую версию говорим только тогда, когда это правда конфликт
      // версий; остальные отказы (гвард, валидация, 500) показываем как есть,
      // иначе оператор чинит не ту проблему.
      toast.error(
        getApiErrorCode(error) === 'EVENT_STATUS_CONFLICT'
          ? t('admin.toasts.eventStatusConflict')
          : getApiErrorMessage(error, t('admin.toasts.eventStatusChangeError')),
      )
    },
  })
}

// ================================
// Mutation: редактировать событие (без изменения статуса)
// ================================

export function useUpdateAdminEvent() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string
      data: UpdateAdminEventRequest
    }) => superAdminService.updateEvent(eventId, data),
    onSuccess: (_data, variables) => {
      // Инвалидируем конкретное событие и список
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_EVENT_QUERY_KEY, variables.eventId],
      })
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })
      toast.success(t('admin.toasts.eventUpdated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.eventUpdateError'))
    },
  })
}

// ================================
// Mutation: удалить событие (soft delete)
// ================================

export function useDeleteAdminEvent() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason?: string }) =>
      superAdminService.deleteEvent(eventId, { reason }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY }),
        queryClient.refetchQueries({ queryKey: PENDING_EVENTS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...ADMIN_EVENT_QUERY_KEY, variables.eventId],
        }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ])
      toast.success(t('admin.toasts.eventDeleted'))
    },
    onError: () => {
      toast.error(t('admin.toasts.eventDeleteError'))
    },
  })
}

/**
 * Хуки центра уведомлений организации.
 * GET /notifications, GET /notifications/unread-count, PATCH /notifications/read
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { notificationsService } from '@api/services'

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const

/** Лента уведомлений. Загружается только когда панель открыта. */
export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'list'],
    queryFn: () => notificationsService.list({ page: 1, limit: 20 }),
    enabled,
  })
}

/**
 * Счётчик непрочитанных для значка в шапке. Отдельный дешёвый запрос — ленту
 * ради цифры не тянем.
 */
export function useUnreadNotificationsCount(enabled = true) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'unread-count'],
    queryFn: () => notificationsService.unreadCount(),
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

/** Отметить прочитанным: без id — всю ленту. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids?: string[]) =>
      notificationsService.markRead(ids?.length ? { ids } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
    meta: { skipToast: true },
  })
}

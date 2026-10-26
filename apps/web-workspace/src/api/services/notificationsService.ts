/**
 * API сервис центра уведомлений организации.
 * Эндпоинты: /api/v1/notifications[/unread-count|/read]
 */

import { request } from '@api/apiClient'

import type {
  MarkNotificationsReadRequest,
  NotificationListResponse,
  UnreadCountResponse,
} from './notification.types'

const NOTIFICATIONS_URL = '/v1/notifications'

export const notificationsService = {
  /** Лента организации, свежие сверху */
  list: (params?: { page?: number; limit?: number }) =>
    request<NotificationListResponse>({
      method: 'GET',
      url: NOTIFICATIONS_URL,
      params,
    }),

  /** Дешёвый счётчик для значка в шапке */
  unreadCount: () =>
    request<UnreadCountResponse>({
      method: 'GET',
      url: `${NOTIFICATIONS_URL}/unread-count`,
    }),

  /** Без списка id отмечает прочитанной всю ленту */
  markRead: (payload: MarkNotificationsReadRequest = {}) =>
    request<UnreadCountResponse, MarkNotificationsReadRequest>({
      method: 'PATCH',
      url: `${NOTIFICATIONS_URL}/read`,
      data: payload,
    }),
}

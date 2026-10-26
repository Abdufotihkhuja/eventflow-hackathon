/**
 * Типы центра уведомлений организации.
 *
 * Бэкенд хранит ТИП и структурированный payload, а не готовую фразу: текст
 * собирает клиент — иначе узбекский и английский интерфейс показывали бы
 * русские строки из БД.
 */

export type NotificationType =
  | 'REGISTRATION_CREATED'
  | 'REGISTRATION_APPROVED'
  | 'REGISTRATION_REJECTED'
  | 'EVENT_PUBLISHED'
  | 'EVENT_REJECTED'
  | 'MEMBER_JOINED'
  | 'ORG_VERIFIED'
  | 'ORG_VERIFICATION_REJECTED'
  | 'EVENT_SUBMITTED'
  | 'EVENT_CHANGES_REQUESTED'
  | 'REGISTRATION_FIRST'
  | 'CAPACITY_THRESHOLD'
  | 'TICKET_REFUND'
  | 'REGISTRATION_CLOSED'
  | 'EVENT_SUMMARY'
  /** Приглашённый отказался вступить в команду (payload: personName, roleName, reason?) */
  | 'MEMBER_INVITE_DECLINED'

/** Подстановки для локализованной строки: набор полей зависит от типа. */
export type NotificationPayload = Record<string, string | number | null> | null

export type Notification = {
  id: string
  type: NotificationType
  entityType?: string | null
  entityId?: string | null
  payload?: NotificationPayload
  readAt?: string | null
  createdAt: string
}

export type NotificationListResponse = {
  data: Notification[]
  total: number
  /** Сколько из них не прочитано */
  unread: number
}

export type UnreadCountResponse = {
  count: number
}

export type MarkNotificationsReadRequest = {
  /** Без списка id отмечается вся лента организации. */
  ids?: string[]
}

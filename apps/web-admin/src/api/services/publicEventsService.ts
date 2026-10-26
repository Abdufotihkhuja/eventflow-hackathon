/**
 * API сервис для публичных событий (без авторизации)
 */

import { request } from '@api/apiClient'
import { publicSdk } from '@api/publicSdk'

import type {
  SearchEventsParams,
  SearchEventsResponse,
  GetPublicEventResponse,
  GetFeaturedEventsResponse,
  GetUpcomingEventsResponse,
  GetSimilarEventsResponse,
} from './publicEvents.types'

const PUBLIC_EVENTS_URL = '/api/v1/public/events'

export const publicEventsService = {
  /** Поиск событий */
  searchEvents: (params?: SearchEventsParams) =>
    request<SearchEventsResponse>({
      method: 'GET',
      url: PUBLIC_EVENTS_URL,
      params,
      skipAuth: true,
    }),

  /** Получить событие по ID */
  getEvent: (eventId: string) =>
    request<GetPublicEventResponse>({
      method: 'GET',
      url: `${PUBLIC_EVENTS_URL}/${eventId}`,
      skipAuth: true,
    }),

  /** Получить событие по slug (публично, только PUBLISHED). GET /v1/events/by-slug/:slug */
  getEventBySlug: (slug: string) =>
    publicSdk.events.getPublicEventBySlug(slug) as Promise<GetPublicEventResponse>,

  /** Получить рекомендуемые события */
  getFeaturedEvents: (limit = 6) =>
    request<GetFeaturedEventsResponse>({
      method: 'GET',
      url: `${PUBLIC_EVENTS_URL}/featured`,
      params: { limit },
      skipAuth: true,
    }),

  /** Получить ближайшие события */
  getUpcomingEvents: (limit = 10) =>
    request<GetUpcomingEventsResponse>({
      method: 'GET',
      url: `${PUBLIC_EVENTS_URL}/upcoming`,
      params: { limit },
      skipAuth: true,
    }),

  /** Получить похожие события */
  getSimilarEvents: (eventId: string, limit = 4) =>
    request<GetSimilarEventsResponse>({
      method: 'GET',
      url: `${PUBLIC_EVENTS_URL}/${eventId}/similar`,
      params: { limit },
      skipAuth: true,
    }),

  /** Увеличить счётчик просмотров */
  trackView: (eventId: string) =>
    request<void>({
      method: 'POST',
      url: `${PUBLIC_EVENTS_URL}/${eventId}/view`,
      skipAuth: true,
    }),

  /** Проверить возможность регистрации (accessType, requiresInviteCode для INVITE_ONLY) */
  canRegister: (eventId: string) =>
    publicSdk.events.canRegister(eventId) as Promise<CanRegisterResponse>,
} as const

export type CanRegisterResponse = {
  canRegister: boolean
  reason?: 'full' | 'closed' | 'deadline_passed' | 'already_registered' | 'private'
  accessType?: 'OPEN' | 'REQUEST' | 'INVITE_ONLY' | 'PRIVATE'
  requiresInviteCode?: boolean
}

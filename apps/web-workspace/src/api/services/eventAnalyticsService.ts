/**
 * Event analytics service.
 *
 * Wraps GET /v1/events/:eventId/analytics. Uses raw `request<>()` (like attendanceService) rather
 * than the generated SDK because adding the endpoint to the OpenAPI surface is out of scope for
 * this change. If/when contracts are regenerated, this can be migrated to workspaceSdk.events.*.
 */

import { request } from '@api/apiClient'

import type {
  EventAnalyticsQuery,
  EventAnalyticsResponse,
} from './eventAnalytics.types'

const url = (eventId: string) => `/v1/events/${eventId}/analytics`

export const eventAnalyticsService = {
  getAnalytics: (eventId: string, params?: EventAnalyticsQuery) =>
    request<EventAnalyticsResponse>({
      method: 'GET',
      url: url(eventId),
      params: params as Record<string, unknown> | undefined,
    }),
} as const

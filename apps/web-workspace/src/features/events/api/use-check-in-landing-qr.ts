/**
 * Хук для получения QR «один для всех» (check-in landing).
 * GET /api/v1/events/:eventId/attendance/check-in-landing-qr (docs/CHECK_IN_FRONTEND.md).
 */

import { useQuery } from '@tanstack/react-query'

import { attendanceService } from '@api/services'

export const checkInLandingQrKeys = {
  all: (eventId: string) => ['events', eventId, 'attendance', 'check-in-landing-qr'] as const,
  detail: (eventId: string) => [...checkInLandingQrKeys.all(eventId)] as const,
}

export function useCheckInLandingQrQuery(eventId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: checkInLandingQrKeys.detail(eventId),
    queryFn: () => attendanceService.getCheckInLandingQr(eventId),
    staleTime: 5 * 60 * 1000,
    enabled: !!eventId && (options?.enabled ?? true),
  })
}

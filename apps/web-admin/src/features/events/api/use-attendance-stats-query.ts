import { useQuery } from '@tanstack/react-query'

import { attendanceService } from '@api/services'

export const attendanceStatsKeys = {
  all: (eventId: string) => ['events', eventId, 'attendance', 'stats'] as const,
  detail: (eventId: string) => [...attendanceStatsKeys.all(eventId)] as const,
}

export function useAttendanceStatsQuery(eventId: string) {
  return useQuery({
    queryKey: attendanceStatsKeys.detail(eventId),
    queryFn: () => attendanceService.getAttendanceStats(eventId),
    staleTime: 30_000, // 30 секунд, статистика обновляется реже
    enabled: !!eventId,
  })
}

import { useQuery } from '@tanstack/react-query'

import { eventsService, type GetAttendanceRequest } from '@api/services'

export const attendanceKeys = {
  all: (eventId: string) => ['events', eventId, 'attendance'] as const,
  list: (params: GetAttendanceRequest) =>
    [...attendanceKeys.all(params.eventId), params.date] as const,
}

export function useAttendanceQuery(params: GetAttendanceRequest) {
  return useQuery({
    queryKey: attendanceKeys.list(params),
    queryFn: () => eventsService.getAttendance(params),
    staleTime: 10_000, // 10 секунд, т.к. данные часто меняются
  })
}

/**
 * Хуки для check-in участников по QR коду
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { attendanceService } from '@api/services/attendanceService'
import type { ApiError } from '@api/types'

/**
 * Хук для глобального check-in по QR коду из билета
 * Используется на странице /check-in?code=...
 */
export function useCheckInByCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (qrCode: string) => attendanceService.checkInByCode(qrCode),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })

      toast.success('Check-in выполнен успешно', {
        description: `${data.participant.firstName} ${data.participant.lastName}`,
      })
    },
    onError: (_error: ApiError) => {
      // Сообщение об ошибке показывается на странице check-in по статусу (400/403/404/409)
    },
  })
}

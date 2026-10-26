/**
 * Хук для активации участника организации по токену (публичный сценарий — ссылка из письма).
 */

import { useMutation } from '@tanstack/react-query'

import { organizationsService } from '@api/services'

export function useActivateMember() {
  return useMutation({
    mutationFn: (token: string) => organizationsService.activateMember(token),
    meta: { skipToast: true },
  })
}

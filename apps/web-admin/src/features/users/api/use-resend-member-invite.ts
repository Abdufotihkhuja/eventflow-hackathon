/**
 * Хук для повторной отправки приглашения сотруднику
 */

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { organizationsService } from '@api/services'

export function useResendMemberInvite() {
  return useMutation({
    mutationFn: (memberId: string) => organizationsService.resendInvitation(memberId),
    onSuccess: () => {
      toast.success('Приглашение отправлено повторно')
    },
    onError: () => {
      toast.error('Не удалось отправить приглашение')
    },
  })
}

/**
 * Хук для повторной отправки приглашения сотруднику
 */

import { useMutation } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { organizationsService } from '@api/services'

export function useResendMemberInvite() {
  const t = useT()

  return useMutation({
    mutationFn: (memberId: string) => organizationsService.resendInvitation(memberId),
    onSuccess: () => {
      toast.success(t('toasts.users.inviteResent'))
    },
    onError: () => {
      toast.error(t('toasts.users.inviteResendError'))
    },
  })
}

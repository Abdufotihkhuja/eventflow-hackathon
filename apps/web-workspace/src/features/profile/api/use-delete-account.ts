import { useMutation } from '@tanstack/react-query'

import { authService } from '@api/services/authService'
import type { DeleteAccountRequest, DeleteAccountResponse } from '@api/services/auth.types'
import type { ApiError } from '@api/types'

type UseDeleteAccountOptions = {
  onSuccess?: (data: DeleteAccountResponse) => void
  onError?: (error: ApiError) => void
}

/**
 * Хук для удаления аккаунта организации
 */
export function useDeleteAccount(options?: UseDeleteAccountOptions) {
  return useMutation<DeleteAccountResponse, ApiError, DeleteAccountRequest>({
    mutationFn: authService.deleteAccount,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

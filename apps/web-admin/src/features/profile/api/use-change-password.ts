import { useMutation } from '@tanstack/react-query'

import { authService } from '@api/services/authService'
import type { ChangePasswordRequest, ChangePasswordResponse } from '@api/services/auth.types'
import type { ApiError } from '@api/types'

type UseChangePasswordOptions = {
  onSuccess?: (data: ChangePasswordResponse) => void
  onError?: (error: ApiError) => void
}

/**
 * Хук для смены пароля
 * PATCH /api/v1/auth/change-password
 */
export function useChangePassword(options?: UseChangePasswordOptions) {
  return useMutation<ChangePasswordResponse, ApiError, ChangePasswordRequest>({
    mutationFn: payload => authService.changePassword(payload),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

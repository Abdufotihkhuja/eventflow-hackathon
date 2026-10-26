import { useMutation, useQueryClient } from '@tanstack/react-query'

import { verificationService } from '@api/services/verificationService'
import {
  VerificationCodeType,
  type SendVerificationCodeRequest,
  type VerifyEmailRequest,
  type ResendCodeRequest,
} from '@api/services/verification.types'
import type { ApiError } from '@api/types'

import { CURRENT_USER_QUERY_KEY } from './use-current-user'

type UseSendVerificationCodeOptions = {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}

/**
 * Отправить код верификации на email (POST /verification/send-code).
 * Для подтверждения почты: type=EMAIL_VERIFICATION, actorType определяется по текущей сессии.
 */
export function useSendVerificationCode(options?: UseSendVerificationCodeOptions) {
  return useMutation<{ message?: string }, ApiError, SendVerificationCodeRequest>({
    mutationFn: payload => verificationService.sendCode(payload),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

type UseVerifyEmailOptions = {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}

/**
 * Подтвердить email по 6-значному коду (POST /verification/verify-email).
 * После успеха инвалидирует текущего пользователя.
 */
export function useVerifyEmail(options?: UseVerifyEmailOptions) {
  const queryClient = useQueryClient()

  return useMutation<{ message?: string }, ApiError, VerifyEmailRequest>({
    mutationFn: payload => verificationService.verifyEmail(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      options?.onSuccess?.()
    },
    onError: options?.onError,
  })
}

type UseResendCodeOptions = {
  onSuccess?: () => void
  onError?: (error: ApiError) => void
}

/**
 * Переотправить код (POST /verification/resend-code).
 */
export function useResendCode(options?: UseResendCodeOptions) {
  return useMutation<{ message?: string }, ApiError, ResendCodeRequest>({
    mutationFn: payload => verificationService.resendCode(payload),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

export { VerificationCodeType }

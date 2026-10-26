import { request } from '@api/apiClient'

import type {
  SendVerificationCodeRequest,
  VerifyEmailRequest,
  ResendCodeRequest,
} from './verification.types'

const VERIFICATION_BASE_URL = '/api/v1/verification'

export const verificationService = {
  /** POST /verification/send-code — отправить код на email */
  sendCode: (payload: SendVerificationCodeRequest) =>
    request<{ message?: string }, SendVerificationCodeRequest>({
      method: 'POST',
      url: `${VERIFICATION_BASE_URL}/send-code`,
      data: payload,
      skipAuth: false,
    }),

  /** POST /verification/verify-email — подтвердить email по коду */
  verifyEmail: (payload: VerifyEmailRequest) =>
    request<{ message?: string }, VerifyEmailRequest>({
      method: 'POST',
      url: `${VERIFICATION_BASE_URL}/verify-email`,
      data: payload,
      skipAuth: false,
    }),

  /** POST /verification/resend-code — переотправить код */
  resendCode: (payload: ResendCodeRequest) =>
    request<{ message?: string }, ResendCodeRequest>({
      method: 'POST',
      url: `${VERIFICATION_BASE_URL}/resend-code`,
      data: payload,
      skipAuth: false,
    }),
}

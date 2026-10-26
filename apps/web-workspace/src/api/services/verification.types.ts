/**
 * Типы для API верификации (docs/API_PUBLIC.md).
 * POST /verification/send-code, verify-email, resend-code
 */

export const VerificationCodeType = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_CHANGE: 'EMAIL_CHANGE',
} as const

export type VerificationCodeType = (typeof VerificationCodeType)[keyof typeof VerificationCodeType]

export const VerificationUserType = {
  USER: 'USER',
  ORGANIZATION: 'ORGANIZATION',
  MEMBER: 'MEMBER',
} as const

export type VerificationUserType = (typeof VerificationUserType)[keyof typeof VerificationUserType]

/** Body POST /verification/send-code (actorType не передаём — бэкенд определяет по JWT) */
export type SendVerificationCodeRequest = {
  email: string
  type: VerificationCodeType
  newEmail?: string
}

/** Body POST /verification/verify-email */
export type VerifyEmailRequest = {
  email: string
  code: string
}

/** Body POST /verification/resend-code */
export type ResendCodeRequest = {
  email: string
  type: VerificationCodeType
}

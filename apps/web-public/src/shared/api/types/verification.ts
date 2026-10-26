/**
 * Типы для системы верификации email с 6-значными кодами
 * Согласно EMAIL_VERIFICATION_API.md
 */

// ============================================================================
// Enum типы
// ============================================================================

export enum VerificationCodeType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
  EMAIL_CHANGE = "EMAIL_CHANGE",
}

// ============================================================================
// Request типы
// ============================================================================

export interface SendCodeRequest {
  email: string;
  type: VerificationCodeType;
  /** Для type=EMAIL_CHANGE */
  newEmail?: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ResendCodeRequest {
  email: string;
  type: VerificationCodeType;
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

export interface ChangeEmailConfirmRequest {
  code: string;
  newEmail: string;
}

// ============================================================================
// Response типы
// ============================================================================

export interface ApiResponse {
  message: string;
}

export interface ChangeEmailResponse extends ApiResponse {
  newEmail: string;
}

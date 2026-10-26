/**
 * API-сервис для верификации email с 6-значными кодами
 * Согласно EMAIL_VERIFICATION_API.md
 */

import { apiPost } from "../lib/apiClient";

import type {
  SendCodeRequest,
  VerifyEmailRequest,
  ResetPasswordRequest,
  ResendCodeRequest,
  ChangeEmailRequest,
  ChangeEmailConfirmRequest,
  ApiResponse,
  ChangeEmailResponse,
} from "./types/verification";

// ============================================================================
// API Endpoints
// ============================================================================

const VERIFICATION_ENDPOINTS = {
  SEND_CODE: "/api/v1/verification/send-code",
  VERIFY_EMAIL: "/api/v1/verification/verify-email",
  RESET_PASSWORD: "/api/v1/verification/reset-password",
  RESEND_CODE: "/api/v1/verification/resend-code",
  CHANGE_EMAIL_REQUEST: "/api/v1/verification/change-email/request",
  CHANGE_EMAIL_CONFIRM: "/api/v1/verification/change-email/confirm",
} as const;

// ============================================================================
// Verification Service
// ============================================================================

export const verificationService = {
  /**
   * Отправить код верификации на email
   * Rate Limit: 3 запроса в минуту
   */
  sendCode: async (data: SendCodeRequest): Promise<ApiResponse> => {
    return apiPost<ApiResponse>(VERIFICATION_ENDPOINTS.SEND_CODE, data);
  },

  /**
   * Подтвердить email по коду
   * Rate Limit: 5 попыток в минуту
   */
  verifyEmail: async (data: VerifyEmailRequest): Promise<ApiResponse> => {
    return apiPost<ApiResponse>(VERIFICATION_ENDPOINTS.VERIFY_EMAIL, data);
  },

  /**
   * Сбросить пароль с кодом верификации
   * Rate Limit: 5 попыток в минуту
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse> => {
    return apiPost<ApiResponse>(VERIFICATION_ENDPOINTS.RESET_PASSWORD, data);
  },

  /**
   * Повторно отправить код
   * Rate Limit: 1 запрос в минуту
   */
  resendCode: async (data: ResendCodeRequest): Promise<ApiResponse> => {
    return apiPost<ApiResponse>(VERIFICATION_ENDPOINTS.RESEND_CODE, data);
  },

  /**
   * Запросить смену email (требует авторизации)
   */
  requestEmailChange: async (
    data: ChangeEmailRequest
  ): Promise<ApiResponse> => {
    return apiPost<ApiResponse>(
      VERIFICATION_ENDPOINTS.CHANGE_EMAIL_REQUEST,
      data
    );
  },

  /**
   * Подтвердить смену email (требует авторизации)
   */
  confirmEmailChange: async (
    data: ChangeEmailConfirmRequest
  ): Promise<ChangeEmailResponse> => {
    return apiPost<ChangeEmailResponse>(
      VERIFICATION_ENDPOINTS.CHANGE_EMAIL_CONFIRM,
      data
    );
  },
};

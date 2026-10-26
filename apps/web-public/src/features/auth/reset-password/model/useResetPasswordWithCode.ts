/**
 * Хук для сброса пароля с кодом верификации
 */

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  verificationService,
  type ResetPasswordRequest,
  type ApiResponse,
} from "@shared/api";

export const useResetPasswordWithCode = (): UseMutationResult<
  ApiResponse,
  Error,
  ResetPasswordRequest
> => {
  return useMutation<ApiResponse, Error, ResetPasswordRequest>({
    mutationFn: (data: ResetPasswordRequest) =>
      verificationService.resetPassword(data),
  });
};

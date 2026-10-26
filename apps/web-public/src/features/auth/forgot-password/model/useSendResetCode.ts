/**
 * Хук для отправки кода сброса пароля
 */

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  VerificationCodeTypeEnum,
  type SendCodeRequest,
  type ApiResponse,
  verificationService,
} from "@shared/api";

export const useSendResetCode = (): UseMutationResult<
  ApiResponse,
  Error,
  string
> => {
  return useMutation<ApiResponse, Error, string>({
    mutationFn: (email: string) => {
      const data: SendCodeRequest = {
        email,
        type: VerificationCodeTypeEnum.PASSWORD_RESET,
      };
      return verificationService.sendCode(data);
    },
  });
};

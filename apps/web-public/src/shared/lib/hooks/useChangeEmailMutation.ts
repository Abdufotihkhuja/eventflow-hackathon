/**
 * TanStack Query хуки для смены email
 * POST /api/v1/verification/change-email/request
 * POST /api/v1/verification/change-email/confirm
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { verificationService } from "@shared/api";

import { CURRENT_USER_QUERY_KEY } from "./useCurrentUserQuery";

import type {
  ApiResponse,
  ChangeEmailRequest,
  ChangeEmailConfirmRequest,
  ChangeEmailResponse,
} from "@shared/api/types/verification";

/**
 * Хук для запроса смены email
 * Отправляет код подтверждения на новый email
 */
export const useRequestEmailChangeMutation = (): UseMutationResult<
  ApiResponse,
  Error,
  ChangeEmailRequest
> => {
  return useMutation({
    mutationKey: ["verification", "change-email", "request"],
    mutationFn: (data: ChangeEmailRequest) =>
      verificationService.requestEmailChange(data),
  });
};

/**
 * Хук для подтверждения смены email
 * Подтверждает смену email по 6-значному коду
 */
export const useConfirmEmailChangeMutation = (): UseMutationResult<
  ChangeEmailResponse,
  Error,
  ChangeEmailConfirmRequest
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["verification", "change-email", "confirm"],
    mutationFn: (data: ChangeEmailConfirmRequest) =>
      verificationService.confirmEmailChange(data),
    onSuccess: () => {
      // Инвалидируем кеш пользователя чтобы обновить email
      void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
};

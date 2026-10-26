/**
 * TanStack Query мутация для смены пароля текущего пользователя
 * PATCH /api/v1/auth/change-password
 */

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  authService,
  type ChangePasswordData,
  type MessageResponse,
} from "@shared/api";

export const CHANGE_PASSWORD_MUTATION_KEY = ["user", "changePassword"] as const;

/**
 * Хук для смены пароля текущего пользователя
 *
 * @returns UseMutationResult для смены пароля
 *
 * @example
 * ```tsx
 * const changePassword = useChangePasswordMutation();
 *
 * const handleChangePassword = (data: ChangePasswordData) => {
 *   changePassword.mutate(data, {
 *     onSuccess: () => {
 *       toast.success('Пароль успешно изменён');
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 * };
 * ```
 */
export const useChangePasswordMutation = (): UseMutationResult<
  MessageResponse,
  Error,
  ChangePasswordData
> => {
  return useMutation<MessageResponse, Error, ChangePasswordData>({
    mutationKey: CHANGE_PASSWORD_MUTATION_KEY,
    mutationFn: async (data: ChangePasswordData) =>
      authService.changePassword(data),
  });
};

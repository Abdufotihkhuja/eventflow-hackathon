/**
 * TanStack Query мутация для удаления аккаунта текущего пользователя
 * DELETE /api/v1/account/me
 */

import {
  useMutation,
  type UseMutationResult,
} from "@tanstack/react-query";

import { authService, type MessageResponse } from "@shared/api";
import { clearAuthSession } from "@shared/lib/apiClient";

export const DELETE_USER_MUTATION_KEY = ["user", "delete"] as const;

/**
 * Хук для удаления аккаунта текущего пользователя
 *
 * После успешного удаления:
 * - Очищает токены авторизации
 * - Очищает данные пользователя из localStorage
 * - Инвалидирует все кеши
 * - Требует редиректа на главную страницу (выполняется в onSuccess колбеке)
 *
 * @returns UseMutationResult для удаления аккаунта
 *
 * @example
 * ```tsx
 * const deleteAccount = useDeleteUserMutation();
 * const router = useRouter();
 *
 * const handleDeleteAccount = () => {
 *   if (confirm('Вы уверены? Это действие нельзя отменить.')) {
 *     deleteAccount.mutate(undefined, {
 *       onSuccess: () => {
 *         toast.success('Аккаунт удален');
 *         router.push('/');
 *       },
 *       onError: (error) => {
 *         toast.error(error.message);
 *       },
 *     });
 *   }
 * };
 * ```
 */
export const useDeleteUserMutation = (): UseMutationResult<
  MessageResponse,
  Error,
  void
> => {
  return useMutation<MessageResponse, Error, void>({
    mutationKey: DELETE_USER_MUTATION_KEY,
    mutationFn: async () => authService.deleteMyAccount(),
    onSuccess: () => {
      // Полностью очищаем сессию после удаления аккаунта
      clearAuthSession();
    },
  });
};

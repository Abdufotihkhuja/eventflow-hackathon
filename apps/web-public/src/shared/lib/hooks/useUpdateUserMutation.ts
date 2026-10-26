/**
 * TanStack Query мутация для обновления данных текущего пользователя
 * PATCH /api/v1/account/me
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { authService, type User, type UpdateUserData } from "@shared/api";

import { CURRENT_USER_QUERY_KEY } from "./useCurrentUserQuery";

export const UPDATE_USER_MUTATION_KEY = ["user", "update"] as const;

/**
 * Хук для обновления данных текущего пользователя
 *
 * Автоматически инвалидирует кеш текущего пользователя после успешного обновления
 *
 * @returns UseMutationResult для обновления пользователя
 *
 * @example
 * ```tsx
 * const updateUser = useUpdateUserMutation();
 *
 * const handleSubmit = (data: UpdateUserData) => {
 *   updateUser.mutate(data, {
 *     onSuccess: (updatedUser) => {
 *       toast.success('Профиль обновлен');
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 * };
 * ```
 */
export const useUpdateUserMutation = (): UseMutationResult<
  User,
  Error,
  UpdateUserData
> => {
  const queryClient = useQueryClient();

  return useMutation<User, Error, UpdateUserData>({
    mutationKey: UPDATE_USER_MUTATION_KEY,
    mutationFn: async (data: UpdateUserData) =>
      authService.updateMyProfile(data),
    onSuccess: (updatedUser) => {
      // Обновляем кеш с данными пользователя
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updatedUser);

      // Также обновляем в localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    },
  });
};

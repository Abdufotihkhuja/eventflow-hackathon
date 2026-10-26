/**
 * @module features/profile/edit/model/useUpdateProfileMutation
 * @description Хук для обновления профиля пользователя
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProfile } from "@entities/profile";

import type { ProfileInfo, UpdateProfileRequest } from "@entities/profile";

export const PROFILE_QUERY_KEY = ["profile", "me"] as const;

interface UseUpdateProfileMutationOptions {
  onSuccess?: (data: ProfileInfo) => void;
  onError?: (error: Error) => void;
}

/**
 * Хук для обновления профиля пользователя
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useUpdateProfileMutation({
 *   onSuccess: () => {
 *     toast.success("Профиль обновлен");
 *   },
 *   onError: (error) => {
 *     toast.error(error.message);
 *   }
 * });
 *
 * mutate({
 *   name: "Иван Иванов",
 *   role: "Product Manager"
 * });
 * ```
 */
export function useUpdateProfileMutation(
  options?: UseUpdateProfileMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),

    // Оптимистичное обновление
    onMutate: async (newProfile) => {
      // Отменяем все активные запросы профиля
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });

      // Сохраняем предыдущее значение для отката
      const previousProfile =
        queryClient.getQueryData<ProfileInfo>(PROFILE_QUERY_KEY);

      // Оптимистично обновляем кэш
      if (previousProfile) {
        queryClient.setQueryData<ProfileInfo>(PROFILE_QUERY_KEY, {
          ...previousProfile,
          ...newProfile,
          // Преобразуем focusAreas если они есть
          focusAreas: newProfile.focusAreas
            ? newProfile.focusAreas.map((area, index) => ({
                id: `focus-${index}`,
                ...area,
              }))
            : previousProfile.focusAreas,
        });
      }

      // Возвращаем контекст с предыдущим значением
      return { previousProfile };
    },

    // При успехе обновляем кэш реальными данными
    onSuccess: (data) => {
      queryClient.setQueryData<ProfileInfo>(PROFILE_QUERY_KEY, data);
      options?.onSuccess?.(data);
    },

    // При ошибке откатываем оптимистичное обновление
    onError: (error, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData<ProfileInfo>(
          PROFILE_QUERY_KEY,
          context.previousProfile
        );
      }
      options?.onError?.(error as Error);
    },

    // После завершения (успех или ошибка) инвалидируем запросы
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

/**
 * Хелпер для инвалидации кэша профиля
 */
export function invalidateProfileQuery(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
}

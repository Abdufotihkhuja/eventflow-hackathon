/**
 * TanStack Query мутация для обновления настроек приватности
 * PATCH /api/v1/account/me/privacy
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  usersService,
  type UpdatePrivacySettingsDto,
  type UpdatePrivacyResponse,
} from "@shared/api/usersService";

import { CURRENT_USER_QUERY_KEY } from "./useCurrentUserQuery";

export const PRIVACY_SETTINGS_MUTATION_KEY = [
  "user",
  "privacy",
  "update",
] as const;

/**
 * Хук для обновления настроек приватности пользователя
 *
 * Автоматически инвалидирует кеш текущего пользователя после успешного обновления
 *
 * @returns UseMutationResult для обновления настроек приватности
 *
 * @example
 * ```tsx
 * const updatePrivacy = usePrivacySettingsMutation();
 *
 * const handleTogglePublicProfile = () => {
 *   updatePrivacy.mutate(
 *     { isPublicProfile: true },
 *     {
 *       onSuccess: () => {
 *         toast.success('Настройки приватности обновлены');
 *       },
 *       onError: (error) => {
 *         toast.error(error.message);
 *       },
 *     }
 *   );
 * };
 * ```
 */
export const usePrivacySettingsMutation = (): UseMutationResult<
  UpdatePrivacyResponse,
  Error,
  UpdatePrivacySettingsDto
> => {
  const queryClient = useQueryClient();

  return useMutation<UpdatePrivacyResponse, Error, UpdatePrivacySettingsDto>({
    mutationKey: PRIVACY_SETTINGS_MUTATION_KEY,
    mutationFn: async (data: UpdatePrivacySettingsDto) =>
      usersService.updatePrivacySettings(data),
    onSuccess: (updatedSettings) => {
      // Обновляем кеш пользователя с новыми настройками приватности
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (oldData: unknown) => {
        if (!oldData || typeof oldData !== "object") return oldData;
        return {
          ...oldData,
          isPublicProfile: updatedSettings.isPublicProfile,
          showEmail: updatedSettings.showEmail,
          showPhone: updatedSettings.showPhone,
        };
      });

      // Инвалидируем кеш для полной синхронизации
      void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
};

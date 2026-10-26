/**
 * TanStack Query мутация для загрузки аватара пользователя
 * POST /api/v1/account/me/avatar
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  authService,
  type UploadAvatarResponse,
  type MessageResponse,
} from "@shared/api";

import { CURRENT_USER_QUERY_KEY } from "./useCurrentUserQuery";

export const UPLOAD_AVATAR_MUTATION_KEY = ["user", "uploadAvatar"] as const;
export const DELETE_AVATAR_MUTATION_KEY = ["user", "deleteAvatar"] as const;

/**
 * Хук для загрузки аватара пользователя
 *
 * После успешной загрузки инвалидирует кеш текущего пользователя
 *
 * @returns UseMutationResult для загрузки аватара
 *
 * @example
 * ```tsx
 * const uploadAvatar = useUploadAvatarMutation();
 *
 * const handleFileChange = (file: File) => {
 *   uploadAvatar.mutate(file, {
 *     onSuccess: (response) => {
 *       toast.success('Аватар успешно загружен');
 *       console.log('URL:', response.avatarUrl);
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 * };
 * ```
 */
export const useUploadAvatarMutation = (): UseMutationResult<
  UploadAvatarResponse,
  Error,
  File
> => {
  const queryClient = useQueryClient();

  return useMutation<UploadAvatarResponse, Error, File>({
    mutationKey: UPLOAD_AVATAR_MUTATION_KEY,
    mutationFn: async (file: File) => authService.uploadAvatar(file),
    onSuccess: async () => {
      // Немедленно перезапрашиваем данные пользователя для обновления аватара
      await queryClient.refetchQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
};

/**
 * Хук для удаления аватара пользователя
 *
 * После успешного удаления инвалидирует кеш текущего пользователя
 *
 * @returns UseMutationResult для удаления аватара
 *
 * @example
 * ```tsx
 * const deleteAvatar = useDeleteAvatarMutation();
 *
 * const handleDeleteAvatar = () => {
 *   deleteAvatar.mutate(undefined, {
 *     onSuccess: () => {
 *       toast.success('Аватар удалён');
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 * };
 * ```
 */
export const useDeleteAvatarMutation = (): UseMutationResult<
  MessageResponse,
  Error,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation<MessageResponse, Error, void>({
    mutationKey: DELETE_AVATAR_MUTATION_KEY,
    mutationFn: async () => authService.deleteAvatar(),
    onSuccess: async () => {
      // Немедленно перезапрашиваем данные пользователя для обновления аватара
      await queryClient.refetchQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
};

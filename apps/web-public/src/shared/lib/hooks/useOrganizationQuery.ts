/**
 * TanStack Query хуки для работы с организациями
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  organizationsService,
  ORGANIZATIONS_QUERY_KEYS,
  type Organization,
  type UpdateOrganizationDto,
  type UploadLogoResponse,
  type DeleteLogoResponse,
} from "@shared/api/organizationsService";
import { ApiError, isAuthenticated } from "@shared/lib/apiClient";

/**
 * Получить организацию с graceful handling 401
 */
async function fetchOrganization(): Promise<Organization | null> {
  if (!isAuthenticated()) {
    return null;
  }

  try {
    return await organizationsService.getMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Хук для получения текущей организации
 * GET /api/v1/workspace/me
 * При отсутствии авторизации возвращает null без ошибки
 *
 * @example
 * ```tsx
 * const { data: organization, isLoading } = useOrganizationQuery();
 * ```
 */
export const useOrganizationQuery = (options?: {
  enabled?: boolean;
  staleTime?: number;
}): UseQueryResult<Organization | null, Error> => {
  return useQuery<Organization | null, Error>({
    queryKey: ORGANIZATIONS_QUERY_KEYS.me,
    queryFn: fetchOrganization,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 минут
    enabled: options?.enabled ?? true,
    retry: false,
  });
};

/**
 * Хук для обновления организации
 * PATCH /api/v1/workspace/me
 *
 * @example
 * ```tsx
 * const { mutate: updateOrg } = useUpdateOrganizationMutation();
 * updateOrg({ name: "Новое название" });
 * ```
 */
export const useUpdateOrganizationMutation = (): UseMutationResult<
  Organization,
  Error,
  UpdateOrganizationDto
> => {
  const queryClient = useQueryClient();

  return useMutation<Organization, Error, UpdateOrganizationDto>({
    mutationFn: (data) => organizationsService.updateMe(data),
    onSuccess: (updatedOrg) => {
      queryClient.setQueryData(ORGANIZATIONS_QUERY_KEYS.me, updatedOrg);
    },
  });
};

/**
 * Хук для удаления организации
 * DELETE /api/v1/workspace/me
 */
export const useDeleteOrganizationMutation = (): UseMutationResult<
  { message: string },
  Error,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, void>({
    mutationFn: () => organizationsService.deleteMe(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ORGANIZATIONS_QUERY_KEYS.me });
    },
  });
};

/**
 * Хук для загрузки логотипа организации
 * POST /api/v1/workspace/me/logo
 *
 * @example
 * ```tsx
 * const { mutate: uploadLogo } = useUploadOrganizationLogoMutation();
 * uploadLogo(file);
 * ```
 */
export const useUploadOrganizationLogoMutation = (): UseMutationResult<
  UploadLogoResponse,
  Error,
  File
> => {
  const queryClient = useQueryClient();

  return useMutation<UploadLogoResponse, Error, File>({
    mutationFn: (file) => organizationsService.uploadLogo(file),
    onSuccess: (result) => {
      // Обновляем кеш организации с новым URL логотипа
      queryClient.setQueryData<Organization>(
        ORGANIZATIONS_QUERY_KEYS.me,
        (old) => (old ? { ...old, logoUrl: result.logoUrl } : old)
      );
    },
  });
};

/**
 * Хук для удаления логотипа организации
 * DELETE /api/v1/workspace/me/logo
 */
export const useDeleteOrganizationLogoMutation = (): UseMutationResult<
  DeleteLogoResponse,
  Error,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation<DeleteLogoResponse, Error, void>({
    mutationFn: () => organizationsService.deleteLogo(),
    onSuccess: () => {
      // Убираем URL логотипа из кеша
      queryClient.setQueryData<Organization>(
        ORGANIZATIONS_QUERY_KEYS.me,
        (old) => (old ? { ...old, logoUrl: undefined } : old)
      );
    },
  });
};

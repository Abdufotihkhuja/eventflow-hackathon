import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authService } from "@api/services/authService";
import type {
  Organization,
  UpdateOrganizationProfileRequest,
} from "@api/services/auth.types";
import type { ApiError } from "@api/types";

import { CURRENT_USER_QUERY_KEY } from "./use-current-user";

type UseUpdateProfileOptions = {
  onSuccess?: (data: Organization) => void;
  onError?: (error: ApiError) => void;
};

/**
 * Хук для обновления профиля организации
 * PATCH /api/v1/workspace/me
 * Обновляет кеш текущего пользователя — Профиль и Настройки синхронизированы.
 */
export function useUpdateProfile(options?: UseUpdateProfileOptions) {
  const queryClient = useQueryClient();

  return useMutation<Organization, ApiError, UpdateOrganizationProfileRequest>({
    mutationFn: (payload) => authService.updateOrganizationProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { type: "organization", data });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * @module features/profile/complete-profile-info/model/useCompleteProfileInfoMutation
 * PATCH /account/me + POST /account/me/complete-profile-info, инвалидация текущего пользователя
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProfile, completeProfileInfo } from "@entities/profile";
import { PROFILE_QUERY_KEY } from "@features/profile/edit/model/useUpdateProfileMutation";
import { CURRENT_USER_QUERY_KEY } from "@shared/lib/hooks/useCurrentUserQuery";

import type { UpdateProfileRequest } from "@entities/profile";
import type { User } from "@shared/api";
import type { UseMutationResult } from "@tanstack/react-query";

interface UseCompleteProfileInfoMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useCompleteProfileInfoMutation(
  options?: UseCompleteProfileInfoMutationOptions
): UseMutationResult<User, Error, UpdateProfileRequest, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      await updateProfile(data);
      return completeProfileInfo();
    },
    onSuccess: (_data) => {
      void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { organizationsService } from "@api/services";
import type { ApiError } from "@api/types";

import { CURRENT_USER_QUERY_KEY } from "./use-current-user";

type UseCompleteOrgOnboardingOptions = {
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
};

/**
 * Завершить онбординг организации (POST /workspace/me/complete-onboarding).
 * Доступно только для организации.
 */
export function useCompleteOrgOnboarding(
  options?: UseCompleteOrgOnboardingOptions,
) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => organizationsService.completeOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

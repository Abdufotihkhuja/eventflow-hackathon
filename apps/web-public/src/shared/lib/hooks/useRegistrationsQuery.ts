/**
 * TanStack Query хуки для работы с регистрациями пользователя
 * GET /api/v1/my-registrations
 * GET /api/v1/registrations/{id}/qr
 * GET /api/v1/registrations/{registrationId}/certificate
 */

import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  registrationService,
  REGISTRATION_QUERY_KEYS,
  type Registration,
  type RegistrationQrResponse,
} from "@shared/api/registrationService";

// ============================================================================
// Registration QR Query
// ============================================================================

interface UseRegistrationQrQueryOptions {
  enabled?: boolean;
}

/**
 * Хук для получения QR-кода регистрации
 */
export const useRegistrationQrQuery = (
  registrationId: string,
  options?: UseRegistrationQrQueryOptions
): UseQueryResult<RegistrationQrResponse, Error> => {
  return useQuery<RegistrationQrResponse, Error>({
    queryKey: REGISTRATION_QUERY_KEYS.qr(registrationId),
    queryFn: () => registrationService.getRegistrationQr(registrationId),
    staleTime: 30 * 60 * 1000, // 30 минут — QR редко меняется
    enabled: (options?.enabled ?? true) && Boolean(registrationId),
  });
};

// ============================================================================
// Re-export types
// ============================================================================

export type { Registration, RegistrationQrResponse };

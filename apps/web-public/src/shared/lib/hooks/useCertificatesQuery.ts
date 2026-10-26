/**
 * TanStack Query хуки для работы с сертификатами пользователя
 * GET /api/v1/account/me/certificates
 * GET /api/v1/account/me/certificates/stats
 * POST /api/v1/account/me/certificates
 * PATCH /api/v1/account/me/certificates/{id}
 * DELETE /api/v1/account/me/certificates/{id}
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { useLocale } from "@eventflow/i18n/react";

import {
  certificatesService,
  CERTIFICATES_QUERY_KEYS,
  type GetCertificatesParams,
  type CertificatesResponse,
  type CertificatesStatsResponse,
  type Certificate,
  type CreateCertificateDto,
  type UpdateCertificateDto,
  type CertificateResponse,
  type DeleteCertificateResponse,
} from "@shared/api/certificatesService";

// Re-export query keys
export { CERTIFICATES_QUERY_KEYS };

// Re-export types
export type {
  Certificate,
  EventCertificate,
  GetCertificatesParams,
  CertificatesResponse,
  CertificatesStatsResponse,
  CreateCertificateDto,
  UpdateCertificateDto,
  CertificateResponse,
  DeleteCertificateResponse,
} from "@shared/api/certificatesService";

// ============================================================================
// Queries
// ============================================================================

interface UseCertificatesQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  params?: GetCertificatesParams;
}

/**
 * Хук для получения списка сертификатов пользователя
 */
export function useCertificatesQuery(
  options?: UseCertificatesQueryOptions
): UseQueryResult<CertificatesResponse, Error> {
  const locale = useLocale();
  const params = { ...options?.params, locale };
  return useQuery<CertificatesResponse, Error>({
    queryKey: CERTIFICATES_QUERY_KEYS.list(params),
    queryFn: () => certificatesService.getCertificates(params),
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 минут
    enabled: options?.enabled ?? true,
  });
}

interface UseCertificatesStatsQueryOptions {
  enabled?: boolean;
}

/**
 * Хук для получения статистики сертификатов
 */
export function useCertificatesStatsQuery(
  options?: UseCertificatesStatsQueryOptions
): UseQueryResult<CertificatesStatsResponse, Error> {
  return useQuery<CertificatesStatsResponse, Error>({
    queryKey: CERTIFICATES_QUERY_KEYS.stats(),
    queryFn: () => certificatesService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 минут
    enabled: options?.enabled ?? true,
  });
}

interface UseCertificateQueryOptions {
  enabled?: boolean;
}

/**
 * Хук для получения сертификата по ID
 */
export function useCertificateQuery(
  id: string,
  options?: UseCertificateQueryOptions
): UseQueryResult<Certificate, Error> {
  return useQuery<Certificate, Error>({
    queryKey: CERTIFICATES_QUERY_KEYS.detail(id),
    queryFn: () => certificatesService.getCertificateById(id),
    staleTime: 10 * 60 * 1000, // 10 минут
    enabled: (options?.enabled ?? true) && Boolean(id),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Хук для создания сертификата
 */
export function useCreateCertificateMutation(): UseMutationResult<
  CertificateResponse,
  Error,
  CreateCertificateDto
> {
  const queryClient = useQueryClient();

  return useMutation<CertificateResponse, Error, CreateCertificateDto>({
    mutationFn: (data) => certificatesService.createCertificate(data),
    onSuccess: () => {
      // Инвалидируем список и статистику
      void queryClient.invalidateQueries({
        queryKey: CERTIFICATES_QUERY_KEYS.all,
      });
    },
  });
}

interface UpdateCertificateVariables {
  id: string;
  data: UpdateCertificateDto;
}

/**
 * Хук для обновления сертификата
 */
export function useUpdateCertificateMutation(): UseMutationResult<
  CertificateResponse,
  Error,
  UpdateCertificateVariables
> {
  const queryClient = useQueryClient();

  return useMutation<CertificateResponse, Error, UpdateCertificateVariables>({
    mutationFn: ({ id, data }) =>
      certificatesService.updateCertificate(id, data),
    onSuccess: (_, { id }) => {
      // Инвалидируем список, статистику и детали
      void queryClient.invalidateQueries({
        queryKey: CERTIFICATES_QUERY_KEYS.all,
      });
      void queryClient.invalidateQueries({
        queryKey: CERTIFICATES_QUERY_KEYS.detail(id),
      });
    },
  });
}

/**
 * Хук для удаления сертификата
 */
export function useDeleteCertificateMutation(): UseMutationResult<
  DeleteCertificateResponse,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation<DeleteCertificateResponse, Error, string>({
    mutationFn: (id) => certificatesService.deleteCertificate(id),
    onSuccess: () => {
      // Инвалидируем список и статистику
      void queryClient.invalidateQueries({
        queryKey: CERTIFICATES_QUERY_KEYS.all,
      });
    },
  });
}

// ============================================================================
// Invalidation Helpers
// ============================================================================

/**
 * Хук для инвалидации кэша сертификатов
 */
export function useInvalidateCertificates() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({
        queryKey: CERTIFICATES_QUERY_KEYS.all,
      }),
    invalidateList: () =>
      queryClient.invalidateQueries({
        queryKey: [...CERTIFICATES_QUERY_KEYS.all, "list"],
      }),
    invalidateStats: () =>
      queryClient.invalidateQueries({
        queryKey: CERTIFICATES_QUERY_KEYS.stats(),
      }),
  };
}

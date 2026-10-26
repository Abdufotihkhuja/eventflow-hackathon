/**
 * TanStack Query хук для экспорта данных пользователя
 * GET /api/v1/account/me/export
 */

import {
  useQuery,
  type UseQueryResult,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  usersService,
  USERS_QUERY_KEYS,
  type UserExportData,
} from "@shared/api/usersService";

export const EXPORT_DATA_QUERY_KEY = USERS_QUERY_KEYS.export();

type ExportDataQueryOptions = Omit<
  UseQueryOptions<UserExportData, Error>,
  "queryKey" | "queryFn"
>;

/**
 * Хук для экспорта данных пользователя (GDPR compliance)
 *
 * По умолчанию запрос не выполняется автоматически (enabled: false),
 * нужно вызвать refetch() для получения данных
 *
 * @param options - Опции для useQuery
 * @returns UseQueryResult с экспортированными данными пользователя
 *
 * @example
 * ```tsx
 * const { data, refetch, isLoading, isFetching } = useExportDataQuery();
 *
 * const handleExport = async () => {
 *   const result = await refetch();
 *   if (result.data) {
 *     // Скачать как JSON файл
 *     const blob = new Blob([JSON.stringify(result.data, null, 2)], {
 *       type: 'application/json',
 *     });
 *     const url = URL.createObjectURL(blob);
 *     const a = document.createElement('a');
 *     a.href = url;
 *     a.download = 'my-data-export.json';
 *     a.click();
 *   }
 * };
 * ```
 */
export const useExportDataQuery = (
  options?: ExportDataQueryOptions
): UseQueryResult<UserExportData, Error> => {
  return useQuery<UserExportData, Error>({
    queryKey: EXPORT_DATA_QUERY_KEY,
    queryFn: async () => usersService.exportData(),
    // По умолчанию отключен, нужно явно вызвать refetch
    enabled: false,
    // Данные не кешируются долго, т.к. это разовая операция
    staleTime: 0,
    gcTime: 0,
    ...options,
  });
};

/**
 * Утилита для скачивания экспортированных данных как JSON файл
 *
 * @param data - Данные для экспорта
 * @param filename - Имя файла (по умолчанию 'eventflow-data-export.json')
 */
export const downloadExportData = (
  data: UserExportData,
  filename = "eventflow-data-export.json"
): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * TanStack Query хук для активных тематик каталога.
 * GET /api/v1/public/categories — управление категориями только у супер-админа,
 * публичный каталог отображает их динамически из БД.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useLocale } from "@eventflow/i18n/react";

import {
  publicCatalogService,
  type Category,
} from "@shared/api/publicCatalogService";

export const PUBLIC_CATEGORIES_QUERY_KEY = ["public", "categories"] as const;

export function usePublicCategories(): UseQueryResult<Category[]> {
  const locale = useLocale();
  return useQuery({
    queryKey: [...PUBLIC_CATEGORIES_QUERY_KEY, locale],
    queryFn: () =>
      publicCatalogService.getCategories(locale as "ru" | "uz" | "en"),
    staleTime: 5 * 60 * 1000,
  });
}

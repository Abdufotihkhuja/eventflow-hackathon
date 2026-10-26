/**
 * Catalog hooks — event categories used by the Discover filter chips. The API
 * returns names already localized under the active `locale`.
 */
import { useQuery } from "@tanstack/react-query";

import { publicSdk } from "@shared/api";
import type { Lang } from "@shared/data/events";

type SdkCategoriesQuery = Parameters<typeof publicSdk.categories.list>[0];

export interface CategoriesQuery {
  locale?: Lang;
}

export function useCategoriesQuery(query?: CategoriesQuery) {
  return useQuery({
    queryKey: ["categories", query ?? {}],
    queryFn: () =>
      publicSdk.categories.list(query as unknown as SdkCategoriesQuery),
    staleTime: 5 * 60_000,
  });
}

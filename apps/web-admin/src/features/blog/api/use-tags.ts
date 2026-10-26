/**
 * Хуки для работы с тегами блога
 * @module features/blog/api/use-tags
 */

import { useQuery } from "@tanstack/react-query";
import { organizationTagsService } from "@api/services";
import type { GetTagsParams } from "@api/services";

/**
 * Query keys для тегов
 */
export const tagsKeys = {
  all: ["tags"] as const,
  organization: () => [...tagsKeys.all, "organization"] as const,
  organizationList: (params?: GetTagsParams) =>
    [...tagsKeys.organization(), "list", params] as const,
};

/**
 * Хук для получения списка тегов организации
 * @param params - параметры запроса
 */
export function useOrganizationTags(params?: GetTagsParams) {
  return useQuery({
    queryKey: tagsKeys.organizationList(params),
    queryFn: () => organizationTagsService.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

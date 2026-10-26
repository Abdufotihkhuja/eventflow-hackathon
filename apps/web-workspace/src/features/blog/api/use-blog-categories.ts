/**
 * Хук для работы с категориями блога (глобальная таксономия)
 * @module features/blog/api/use-blog-categories
 */

import { useQuery } from "@tanstack/react-query";
import { blogCategoriesService } from "@api/services";

/**
 * Query keys для категорий блога
 */
export const blogCategoriesKeys = {
  all: ["blog-categories"] as const,
  list: (locale?: string) => [...blogCategoriesKeys.all, "list", locale] as const,
};

/**
 * Хук для получения списка активных категорий блога
 */
export function useBlogCategories(locale?: string) {
  return useQuery({
    queryKey: blogCategoriesKeys.list(locale),
    queryFn: () => blogCategoriesService.getAll(locale ? { locale } : undefined),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}

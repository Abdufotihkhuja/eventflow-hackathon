/**
 * Slug для статей блога: предложение по заголовку и проверка доступности.
 * Вызывать с debounce (title/slug). При редактировании передавать excludeId.
 */

import { useQuery } from "@tanstack/react-query";
import { blogPostsService } from "@api/services";
import { SLUG_VALID_REGEX } from "@shared/lib";
import { blogPostsKeys } from "./use-blog-posts";

export const BLOG_SUGGEST_SLUG_KEY = [...blogPostsKeys.all, "suggest-slug"] as const;
export const BLOG_CHECK_SLUG_KEY = [...blogPostsKeys.all, "check-slug"] as const;

/**
 * Предложить slug по заголовку (debounced title). При редактировании — excludeId = id статьи.
 */
export function useSuggestBlogSlug(debouncedTitle: string | undefined, excludeId?: string) {
  const titleTrim = (debouncedTitle ?? "").trim();
  return useQuery({
    queryKey: [...BLOG_SUGGEST_SLUG_KEY, titleTrim, excludeId],
    queryFn: () =>
      blogPostsService.suggestSlug({
        title: titleTrim.slice(0, 500),
        excludeId,
      }),
    enabled: titleTrim.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Проверить доступность slug (debounced slug). При редактировании — excludeId = id статьи.
 */
export function useCheckBlogSlug(debouncedSlug: string | undefined, excludeId?: string) {
  const slugTrim = (debouncedSlug ?? "").trim().toLowerCase();
  const isValidFormat = SLUG_VALID_REGEX.test(slugTrim);

  return useQuery({
    queryKey: [...BLOG_CHECK_SLUG_KEY, slugTrim, excludeId],
    queryFn: () =>
      blogPostsService.checkSlug({
        slug: slugTrim,
        excludeId,
      }),
    enabled: slugTrim.length > 0 && isValidFormat,
    staleTime: 60_000,
  });
}

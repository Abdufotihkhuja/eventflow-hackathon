/**
 * TanStack Query хуки для публичного блога
 * @module features/blog/api/use-public-blog
 */

import { useQuery } from "@tanstack/react-query";
import {
  publicBlogService,
  type GetPublishedBlogPostsParams,
} from "@api/services";

/**
 * Query keys для публичного блога
 */
export const publicBlogKeys = {
  all: ["public-blog"] as const,
  lists: () => [...publicBlogKeys.all, "list"] as const,
  list: (params: GetPublishedBlogPostsParams = {}) =>
    [...publicBlogKeys.lists(), params] as const,
  details: () => [...publicBlogKeys.all, "detail"] as const,
  detail: (id: string) => [...publicBlogKeys.details(), id] as const,
  bySlug: (slug: string) => [...publicBlogKeys.all, "slug", slug] as const,
};

/**
 * Хук для получения списка опубликованных статей
 */
export function usePublishedBlogPosts(params: GetPublishedBlogPostsParams = {}) {
  return useQuery({
    queryKey: publicBlogKeys.list(params),
    queryFn: () => publicBlogService.getAll(params),
    staleTime: 30_000, // 30 секунд
  });
}

/**
 * Хук для получения статьи по slug
 */
export function useBlogPostBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: publicBlogKeys.bySlug(slug!),
    queryFn: () => publicBlogService.getBySlug(slug!),
    enabled: !!slug,
    staleTime: 60_000, // 1 минута
  });
}

/**
 * Хук для получения статьи по ID (публичный доступ)
 */
export function usePublicBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: publicBlogKeys.detail(id!),
    queryFn: () => publicBlogService.getById(id!),
    enabled: !!id,
    staleTime: 60_000, // 1 минута
  });
}

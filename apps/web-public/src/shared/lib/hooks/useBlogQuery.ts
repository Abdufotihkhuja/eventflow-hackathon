/**
 * @module shared/lib/hooks/useBlogQuery
 * @description TanStack Query хуки для работы с блогом
 * @todo Переместить в entities/blog/model согласно FSD
 */

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@eventflow/i18n/react";

/* eslint-disable import/no-restricted-paths */
import type {
  BlogFilters,
  BlogListResponse,
  BlogPost,
  BlogPostCategory,
} from "@/entities/blog";
/* eslint-enable import/no-restricted-paths */

import { blogService } from "@/shared/api";

export const BLOG_QUERY_KEYS = {
  all: ["blog", "v2"] as const, // v2: добавлена логика fallback при пустом API
  lists: () => [...BLOG_QUERY_KEYS.all, "list"] as const,
  list: (filters: BlogFilters, page: number, locale: string) =>
    [...BLOG_QUERY_KEYS.lists(), filters, page, locale] as const,
  details: () => [...BLOG_QUERY_KEYS.all, "detail"] as const,
  detail: (slug: string, locale: string) =>
    [...BLOG_QUERY_KEYS.details(), slug, locale] as const,
  featured: (locale: string) =>
    [...BLOG_QUERY_KEYS.all, "featured", locale] as const,
  trending: (locale: string) =>
    [...BLOG_QUERY_KEYS.all, "trending", locale] as const,
  related: (postId: string) =>
    [...BLOG_QUERY_KEYS.all, "related", postId] as const,
  categories: (locale: string) =>
    [...BLOG_QUERY_KEYS.all, "categories", locale] as const,
};

/**
 * Хук для получения списка статей с фильтрацией
 */
export function useBlogPostsQuery(
  filters: BlogFilters = {},
  page = 1,
  pageSize = 9,
  initialData?: BlogListResponse
) {
  const locale = useLocale();

  return useQuery({
    queryKey: BLOG_QUERY_KEYS.list(filters, page, locale),
    queryFn: () => blogService.getPosts(filters, page, pageSize, locale),
    staleTime: 5 * 60 * 1000, // 5 минут
    initialData,
  });
}

/**
 * Хук для получения одной статьи по slug
 */
export function useBlogPostQuery(slug: string) {
  const locale = useLocale();

  return useQuery({
    queryKey: BLOG_QUERY_KEYS.detail(slug, locale),
    queryFn: () => blogService.getPostBySlug(slug, locale),
    staleTime: 10 * 60 * 1000, // 10 минут
    enabled: !!slug,
  });
}

/**
 * Хук для получения featured статей
 */
export function useFeaturedPostsQuery(limit = 3, initialData?: BlogPost[]) {
  const locale = useLocale();

  return useQuery({
    queryKey: BLOG_QUERY_KEYS.featured(locale),
    queryFn: () => blogService.getFeaturedPosts(limit, locale),
    staleTime: 10 * 60 * 1000,
    initialData,
  });
}

/**
 * Хук для получения trending статей
 */
export function useTrendingPostsQuery(limit = 5) {
  const locale = useLocale();

  return useQuery({
    queryKey: BLOG_QUERY_KEYS.trending(locale),
    queryFn: () => blogService.getTrendingPosts(limit, locale),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Хук для получения динамических категорий блога.
 * Имена приходят локализованными (передаём текущую локаль).
 */
export function useBlogCategoriesQuery(initialData?: BlogPostCategory[]) {
  const locale = useLocale();

  return useQuery({
    queryKey: BLOG_QUERY_KEYS.categories(locale),
    queryFn: () => blogService.getCategories(locale),
    staleTime: 10 * 60 * 1000,
    initialData,
  });
}

/**
 * Хук для получения связанных статей
 */
export function useRelatedPostsQuery(postId: string, limit = 3) {
  return useQuery({
    queryKey: BLOG_QUERY_KEYS.related(postId),
    queryFn: () => blogService.getRelatedPosts(postId, limit),
    staleTime: 10 * 60 * 1000,
    enabled: !!postId,
  });
}

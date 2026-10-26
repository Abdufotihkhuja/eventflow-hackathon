/**
 * TanStack Query хуки для управления статьями блога (организатор)
 * @module features/blog/api/use-blog-posts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@eventflow/i18n/react";
import { toast } from "sonner";
import {
  blogPostsService,
  type CreateBlogPostDto,
  type UpdateBlogPostDto,
  type GetBlogPostsParams,
} from "@api/services";

/**
 * Query keys для блога
 */
export const blogPostsKeys = {
  all: ["blog-posts"] as const,
  lists: () => [...blogPostsKeys.all, "list"] as const,
  list: (params: GetBlogPostsParams = {}) =>
    [...blogPostsKeys.lists(), params] as const,
  details: () => [...blogPostsKeys.all, "detail"] as const,
  detail: (id: string) => [...blogPostsKeys.details(), id] as const,
};

/**
 * Хук для получения списка статей организации
 */
export function useBlogPosts(params: GetBlogPostsParams = {}) {
  return useQuery({
    queryKey: blogPostsKeys.list(params),
    queryFn: () => blogPostsService.getAll(params),
    staleTime: 30_000, // 30 секунд
  });
}

/**
 * Хук для получения статьи по ID
 */
export function useBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: blogPostsKeys.detail(id!),
    queryFn: () => blogPostsService.getById(id!),
    enabled: !!id,
    staleTime: 60_000, // 1 минута
  });
}

/**
 * Хук для создания статьи
 */
export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: (data: CreateBlogPostDto) => blogPostsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.lists() });
      toast.success(t("toasts.blog.postCreated"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.postCreateError"), {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для обновления статьи
 */
export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogPostDto }) =>
      blogPostsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.detail(id) });
      toast.success(t("toasts.blog.postUpdated"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.postUpdateError"), {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для удаления статьи
 */
export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => blogPostsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.lists() });
      toast.success(t("toasts.blog.postDeleted"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.postDeleteError"), {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для отправки статьи на модерацию
 */
export function useSubmitBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => blogPostsService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.detail(id) });
      toast.success(t("toasts.blog.postSubmitted"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.postSubmitError"), {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для публикации статьи
 */
export function usePublishBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => blogPostsService.publish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.detail(id) });
      toast.success(t("toasts.blog.postPublished"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.postPublishError"), {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для снятия статьи с публикации
 */
export function useUnpublishBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => blogPostsService.unpublish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogPostsKeys.detail(id) });
      toast.success(t("toasts.blog.postUnpublished"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.postUnpublishError"), {
        description: error.message,
      });
    },
  });
}

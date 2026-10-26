/**
 * TanStack Query хуки для лайков статей блога
 * @module features/blog/api/use-blog-likes
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@eventflow/i18n/react";
import { toast } from "sonner";
import { blogLikesService } from "@api/services";

/**
 * Query keys для лайков
 */
export const blogLikesKeys = {
  all: ["blog-likes"] as const,
  check: (postId: string) => [...blogLikesKeys.all, "check", postId] as const,
};

/**
 * Хук для проверки, лайкнул ли пользователь статью
 */
export function useBlogLikeCheck(postId: string | undefined) {
  return useQuery({
    queryKey: blogLikesKeys.check(postId!),
    queryFn: () => blogLikesService.check(postId!),
    enabled: !!postId,
    staleTime: 60_000, // 1 минута
  });
}

/**
 * Хук для лайка статьи
 */
export function useLikeBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: (postId: string) => blogLikesService.like(postId),
    onSuccess: (_, postId) => {
      // Инвалидируем проверку лайка
      queryClient.invalidateQueries({
        queryKey: blogLikesKeys.check(postId),
      });
      // Инвалидируем детали статьи (там счётчик лайков)
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "detail", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "detail", postId],
      });
      // Инвалидируем списки
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "list"],
      });
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.likeError"), {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для удаления лайка
 */
export function useUnlikeBlogPost() {
  const queryClient = useQueryClient();
  const t = useT();

  return useMutation({
    mutationFn: (postId: string) => blogLikesService.unlike(postId),
    onSuccess: (_, postId) => {
      // Инвалидируем проверку лайка
      queryClient.invalidateQueries({
        queryKey: blogLikesKeys.check(postId),
      });
      // Инвалидируем детали статьи
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "detail", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "detail", postId],
      });
      // Инвалидируем списки
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "list"],
      });
    },
    onError: (error: Error) => {
      toast.error(t("toasts.blog.likeError"), {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для переключения лайка (like/unlike)
 */
export function useToggleBlogLike() {
  const likeMutation = useLikeBlogPost();
  const unlikeMutation = useUnlikeBlogPost();

  return {
    toggle: (postId: string, isLiked: boolean) => {
      if (isLiked) {
        return unlikeMutation.mutateAsync(postId);
      } else {
        return likeMutation.mutateAsync(postId);
      }
    },
    isPending: likeMutation.isPending || unlikeMutation.isPending,
  };
}

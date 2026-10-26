/**
 * TanStack Query хуки для сохранённых статей блога
 * @module features/blog/api/use-saved-blog-posts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { savedBlogPostsService } from "@api/services";

/**
 * Query keys для сохранённых статей
 */
export const savedBlogPostsKeys = {
  all: ["saved-blog-posts"] as const,
  lists: () => [...savedBlogPostsKeys.all, "list"] as const,
  list: (params: { page?: number; limit?: number } = {}) =>
    [...savedBlogPostsKeys.lists(), params] as const,
  check: (postId: string) =>
    [...savedBlogPostsKeys.all, "check", postId] as const,
};

/**
 * Хук для получения списка сохранённых статей
 */
export function useSavedBlogPosts(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: savedBlogPostsKeys.list(params),
    queryFn: () => savedBlogPostsService.getAll(params),
    staleTime: 30_000, // 30 секунд
  });
}

/**
 * Хук для проверки, сохранена ли статья
 */
export function useSavedBlogPostCheck(postId: string | undefined) {
  return useQuery({
    queryKey: savedBlogPostsKeys.check(postId!),
    queryFn: () => savedBlogPostsService.check(postId!),
    enabled: !!postId,
    staleTime: 60_000, // 1 минута
  });
}

/**
 * Хук для сохранения статьи
 */
export function useSaveBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => savedBlogPostsService.save(postId),
    onSuccess: (_, postId) => {
      // Инвалидируем список сохранённых
      queryClient.invalidateQueries({
        queryKey: savedBlogPostsKeys.lists(),
      });
      // Инвалидируем проверку
      queryClient.invalidateQueries({
        queryKey: savedBlogPostsKeys.check(postId),
      });
      // Инвалидируем детали статьи
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "detail", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "detail", postId],
      });
      toast.success("Статья сохранена");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при сохранении статьи", {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для удаления статьи из сохранённых
 */
export function useUnsaveBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => savedBlogPostsService.unsave(postId),
    onSuccess: (_, postId) => {
      // Инвалидируем список сохранённых
      queryClient.invalidateQueries({
        queryKey: savedBlogPostsKeys.lists(),
      });
      // Инвалидируем проверку
      queryClient.invalidateQueries({
        queryKey: savedBlogPostsKeys.check(postId),
      });
      // Инвалидируем детали статьи
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "detail", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "detail", postId],
      });
      toast.success("Статья удалена из сохранённых");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при удалении из сохранённых", {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для переключения сохранения (save/unsave)
 */
export function useToggleSaveBlogPost() {
  const saveMutation = useSaveBlogPost();
  const unsaveMutation = useUnsaveBlogPost();

  return {
    toggle: (postId: string, isSaved: boolean) => {
      if (isSaved) {
        return unsaveMutation.mutateAsync(postId);
      } else {
        return saveMutation.mutateAsync(postId);
      }
    },
    isPending: saveMutation.isPending || unsaveMutation.isPending,
  };
}

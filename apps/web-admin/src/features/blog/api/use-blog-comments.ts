/**
 * TanStack Query хуки для комментариев к статьям блога
 * @module features/blog/api/use-blog-comments
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  blogCommentsService,
  type CreateCommentDto,
  type UpdateCommentDto,
  type GetCommentsParams,
} from "@api/services";

/**
 * Query keys для комментариев
 */
export const blogCommentsKeys = {
  all: ["blog-comments"] as const,
  lists: () => [...blogCommentsKeys.all, "list"] as const,
  list: (postId: string, params: GetCommentsParams = {}) =>
    [...blogCommentsKeys.lists(), postId, params] as const,
};

/**
 * Хук для получения комментариев к статье
 */
export function useBlogComments(
  postId: string | undefined,
  params: GetCommentsParams = {}
) {
  return useQuery({
    queryKey: blogCommentsKeys.list(postId!, params),
    queryFn: () => blogCommentsService.getAll(postId!, params),
    enabled: !!postId,
    staleTime: 30_000, // 30 секунд
  });
}

/**
 * Хук для создания комментария
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: CreateCommentDto }) =>
      blogCommentsService.create(postId, data),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: blogCommentsKeys.lists(),
      });
      // Также инвалидируем публичный блог, т.к. там может отображаться счётчик комментариев
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "detail", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "detail", postId],
      });
      toast.success("Комментарий добавлен");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при добавлении комментария", {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для обновления комментария
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      commentId,
      data,
    }: {
      postId: string;
      commentId: string;
      data: UpdateCommentDto;
    }) => blogCommentsService.update(postId, commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: blogCommentsKeys.lists(),
      });
      toast.success("Комментарий обновлён");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при обновлении комментария", {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для удаления комментария
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      blogCommentsService.delete(postId, commentId),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: blogCommentsKeys.lists(),
      });
      // Инвалидируем счётчики
      queryClient.invalidateQueries({
        queryKey: ["public-blog", "detail", postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["blog-posts", "detail", postId],
      });
      toast.success("Комментарий удалён");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при удалении комментария", {
        description: error.message,
      });
    },
  });
}

/**
 * Хук для лайка/дизлайка комментария
 */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      blogCommentsService.toggleLike(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: blogCommentsKeys.lists(),
      });
    },
    onError: (error: Error) => {
      toast.error("Ошибка при изменении лайка", {
        description: error.message,
      });
    },
  });
}

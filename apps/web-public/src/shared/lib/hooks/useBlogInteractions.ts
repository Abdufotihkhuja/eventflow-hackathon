/**
 * @module shared/lib/hooks/useBlogInteractions
 * @description TanStack Query хуки для взаимодействия с блогом (лайки, сохранения)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  blogInteractionsService,
  BLOG_INTERACTIONS_QUERY_KEYS,
  type GetSavedPostsParams,
  type CheckLikeResponse,
  type CheckSavedResponse,
} from "@/shared/api/blogInteractionsService";
import { ApiError, isAuthenticated } from "@/shared/lib/apiClient";

/** Сообщение для тоста при ошибке лайка/сохранения (401 → сессия истекла) */
export function getBlogInteractionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Сессия истекла. Войдите снова.";
  }
  if (error instanceof Error) return error.message;
  return "Не удалось выполнить действие.";
}

// ============================================================================
// Likes Hooks
// ============================================================================

/** Не ретраить при 401 — нет смысла повторять неавторизованный запрос */
function noRetryOn401<T>(_failureCount: number, error: T): boolean {
  const err = error as { status?: number };
  return err?.status !== 401;
}

export interface UseCheckLikeQueryOptions {
  /** Lazy: не запрашивать, пока не true (например, карточка во viewport) */
  enabled?: boolean;
}

/**
 * Хук для проверки лайка статьи
 * Работает только для авторизованных пользователей — иначе API возвращает 401 и срабатывает редирект
 */
export function useCheckLikeQuery(
  postId: string,
  options?: UseCheckLikeQueryOptions
) {
  const enabled = options?.enabled !== false;
  const isAuth = typeof window !== "undefined" && isAuthenticated();
  const canRun = typeof window !== "undefined" && !!postId && enabled && isAuth;

  return useQuery({
    queryKey: BLOG_INTERACTIONS_QUERY_KEYS.checkLike(postId),
    queryFn: () => blogInteractionsService.checkLike(postId),
    enabled: canRun,
    staleTime: 30 * 1000, // 30 секунд
    retry: noRetryOn401,
    placeholderData: { isLiked: false, likesCount: 0 },
  });
}

const LIKE_FALLBACK: CheckLikeResponse = { isLiked: false, likesCount: 0 };

/**
 * Хук для toggle лайка (лайк/анлайк)
 * @param onError — вызывается при ошибке (в т.ч. 401), после отката UI
 */
export function useToggleLikeMutation(
  postId: string,
  onError?: (error: unknown) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isCurrentlyLiked: boolean) => {
      if (isCurrentlyLiked) {
        return blogInteractionsService.unlikePost(postId);
      }
      return blogInteractionsService.likePost(postId);
    },
    // Оптимистичное обновление
    onMutate: async (isCurrentlyLiked) => {
      // Отменяем исходящие запросы
      await queryClient.cancelQueries({
        queryKey: BLOG_INTERACTIONS_QUERY_KEYS.checkLike(postId),
      });

      // Сохраняем предыдущее значение
      const previousData = queryClient.getQueryData<CheckLikeResponse>(
        BLOG_INTERACTIONS_QUERY_KEYS.checkLike(postId)
      );

      // Оптимистично обновляем
      queryClient.setQueryData<CheckLikeResponse>(
        BLOG_INTERACTIONS_QUERY_KEYS.checkLike(postId),
        (old) => {
          let likesCount: number;
          if (old) {
            likesCount = old.likesCount + (isCurrentlyLiked ? -1 : 1);
          } else {
            likesCount = isCurrentlyLiked ? 0 : 1;
          }
          return { isLiked: !isCurrentlyLiked, likesCount };
        }
      );

      return { previousData };
    },
    onSuccess: (data, isCurrentlyLiked) => {
      // Фиксируем состояние из ответа API, чтобы UI гарантированно обновился
      queryClient.setQueryData<CheckLikeResponse>(
        BLOG_INTERACTIONS_QUERY_KEYS.checkLike(postId),
        {
          isLiked: !isCurrentlyLiked,
          likesCount: data.likesCount,
        }
      );
    },
    onError: (err, _variables, context) => {
      const safe = context?.previousData ?? LIKE_FALLBACK;
      queryClient.setQueryData(
        BLOG_INTERACTIONS_QUERY_KEYS.checkLike(postId),
        safe
      );
      onError?.(err);
    },
    onSettled: () => {
      // Не инвалидируем check — состояние уже обновлено в onSuccess; refetch мог бы перезаписать UI
    },
  });
}

// ============================================================================
// Saved Posts Hooks
// ============================================================================

export interface UseSavedBlogPostsQueryOptions {
  /** Lazy: запрашивать только при true (например, при открытии страницы «Сохранённые») */
  enabled?: boolean;
}

/**
 * Хук для получения списка сохранённых статей
 * Lazy: передайте options.enabled: true только на странице «Сохранённые», чтобы не грузить список на других страницах
 */
export function useSavedBlogPostsQuery(
  params?: GetSavedPostsParams,
  options?: UseSavedBlogPostsQueryOptions
) {
  const isAuth = typeof window !== "undefined" && isAuthenticated();
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: BLOG_INTERACTIONS_QUERY_KEYS.savedList(params),
    queryFn: () => blogInteractionsService.getSavedPosts(params),
    enabled: isAuth && enabled,
    staleTime: 60 * 1000, // 1 минута
    retry: noRetryOn401,
  });
}

export interface UseCheckSavedQueryOptions {
  /** Lazy: не запрашивать, пока не true */
  enabled?: boolean;
}

/**
 * Хук для проверки, сохранена ли статья
 * Работает только для авторизованных — иначе API возвращает 401 и срабатывает редирект
 */
export function useCheckSavedQuery(
  postId: string,
  options?: UseCheckSavedQueryOptions
) {
  const enabled = options?.enabled !== false;
  const isAuth = typeof window !== "undefined" && isAuthenticated();
  const canRun = typeof window !== "undefined" && !!postId && enabled && isAuth;

  return useQuery({
    queryKey: BLOG_INTERACTIONS_QUERY_KEYS.checkSaved(postId),
    queryFn: () => blogInteractionsService.checkSaved(postId),
    enabled: canRun,
    staleTime: 30 * 1000,
    retry: noRetryOn401,
    placeholderData: { isSaved: false },
  });
}

const SAVED_FALLBACK: CheckSavedResponse = { isSaved: false };

/**
 * Хук для toggle сохранения (сохранить/удалить)
 * @param onError — вызывается при ошибке (в т.ч. 401), после отката UI
 */
export function useToggleSaveMutation(
  postId: string,
  onError?: (error: unknown) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isCurrentlySaved: boolean) => {
      if (isCurrentlySaved) {
        return blogInteractionsService.unsavePost(postId);
      }
      return blogInteractionsService.savePost(postId);
    },
    // Оптимистичное обновление
    onMutate: async (isCurrentlySaved) => {
      await queryClient.cancelQueries({
        queryKey: BLOG_INTERACTIONS_QUERY_KEYS.checkSaved(postId),
      });

      const previousData = queryClient.getQueryData<CheckSavedResponse>(
        BLOG_INTERACTIONS_QUERY_KEYS.checkSaved(postId)
      );

      queryClient.setQueryData<CheckSavedResponse>(
        BLOG_INTERACTIONS_QUERY_KEYS.checkSaved(postId),
        { isSaved: !isCurrentlySaved }
      );

      return { previousData };
    },
    onSuccess: (_data, isCurrentlySaved) => {
      // Фиксируем состояние после мутации, чтобы UI гарантированно обновился
      queryClient.setQueryData<CheckSavedResponse>(
        BLOG_INTERACTIONS_QUERY_KEYS.checkSaved(postId),
        { isSaved: !isCurrentlySaved }
      );
    },
    onError: (err, _variables, context) => {
      const safe = context?.previousData ?? SAVED_FALLBACK;
      queryClient.setQueryData(
        BLOG_INTERACTIONS_QUERY_KEYS.checkSaved(postId),
        safe
      );
      onError?.(err);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: BLOG_INTERACTIONS_QUERY_KEYS.saved(),
      });
    },
  });
}

// ============================================================================
// Combined Hook
// ============================================================================

export interface UseBlogPostInteractionsOptions {
  onLikeError?: (error: unknown) => void;
  onSaveError?: (error: unknown) => void;
  /** Lazy: не запрашивать check like/saved, пока не true (по умолчанию true) */
  enabled?: boolean;
}

/**
 * Комбинированный хук для всех взаимодействий с постом
 * @param options.onLikeError — вызывается при ошибке лайка (в т.ч. 401)
 * @param options.onSaveError — вызывается при ошибке сохранения (в т.ч. 401)
 */
export function useBlogPostInteractions(
  postId: string,
  options?: UseBlogPostInteractionsOptions
) {
  const isAuth = typeof window !== "undefined" && isAuthenticated();
  const enabled = options?.enabled !== false;

  const likeQuery = useCheckLikeQuery(postId, { enabled });
  const savedQuery = useCheckSavedQuery(postId, { enabled });
  const toggleLikeMutation = useToggleLikeMutation(
    postId,
    options?.onLikeError
  );
  const toggleSaveMutation = useToggleSaveMutation(
    postId,
    options?.onSaveError
  );

  const isLiked = likeQuery.data?.isLiked ?? false;
  const likesCount = likeQuery.data?.likesCount ?? 0;
  const isSaved = savedQuery.data?.isSaved ?? false;

  const handleToggleLike = () => {
    if (!isAuth) return;
    toggleLikeMutation.mutate(isLiked);
  };

  const handleToggleSave = () => {
    if (!isAuth) return;
    toggleSaveMutation.mutate(isSaved);
  };

  return {
    // State
    isAuthenticated: isAuth,
    isLiked,
    likesCount,
    isSaved,

    // Loading states
    isLikeLoading: likeQuery.isLoading || toggleLikeMutation.isPending,
    isSaveLoading: savedQuery.isLoading || toggleSaveMutation.isPending,

    // Actions
    toggleLike: handleToggleLike,
    toggleSave: handleToggleSave,
  };
}

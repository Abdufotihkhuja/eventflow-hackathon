/**
 * TanStack Query хуки для работы с избранными статьями
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  articlesService,
  ARTICLES_QUERY_KEYS,
  type GetArticlesParams,
  type SaveArticleDto,
  type SavedArticlesResponse,
  type SaveArticleResponse,
  type DeleteArticleResponse,
  type CheckArticleResponse,
} from "@/shared/api/articlesService";

// Re-export query keys
export { ARTICLES_QUERY_KEYS };

// Re-export types
export type {
  SavedArticle,
  SavedArticlesResponse,
  SaveArticleDto,
  SaveArticleResponse,
  DeleteArticleResponse,
  CheckArticleResponse,
  GetArticlesParams,
} from "@/shared/api/articlesService";

// ============================================================================
// Queries
// ============================================================================

/**
 * Хук для получения списка избранных статей
 */
export function useSavedArticlesQuery(params?: GetArticlesParams) {
  return useQuery<SavedArticlesResponse>({
    queryKey: ARTICLES_QUERY_KEYS.list(params),
    queryFn: () => articlesService.getArticles(params),
    staleTime: 1000 * 60 * 5, // 5 минут
  });
}

/**
 * Хук для проверки, сохранена ли статья
 */
export function useCheckArticleQuery(
  url: string,
  options?: { enabled?: boolean }
) {
  return useQuery<CheckArticleResponse>({
    queryKey: ARTICLES_QUERY_KEYS.check(url),
    queryFn: () => articlesService.checkArticle(url),
    enabled: options?.enabled ?? !!url,
    staleTime: 1000 * 60, // 1 минута
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Хук для сохранения статьи в избранное
 */
export function useSaveArticleMutation() {
  const queryClient = useQueryClient();

  return useMutation<SaveArticleResponse, Error, SaveArticleDto>({
    mutationFn: (data) => articlesService.saveArticle(data),
    onSuccess: (data) => {
      // Инвалидируем список статей
      void queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.all });

      // Обновляем кэш проверки для этой статьи
      const url = data.article.url ?? data.article.articleUrl;
      if (url) {
        queryClient.setQueryData<CheckArticleResponse>(
          ARTICLES_QUERY_KEYS.check(url),
          { isSaved: true, articleId: data.article.id }
        );
      }
    },
  });
}

/**
 * Хук для удаления статьи по URL
 */
export function useDeleteArticleByUrlMutation() {
  const queryClient = useQueryClient();

  return useMutation<DeleteArticleResponse, Error, string>({
    mutationFn: (url) => articlesService.deleteArticleByUrl(url),
    onSuccess: (_, url) => {
      // Инвалидируем список статей
      void queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.all });

      // Обновляем кэш проверки для этой статьи
      queryClient.setQueryData<CheckArticleResponse>(
        ARTICLES_QUERY_KEYS.check(url),
        { isSaved: false }
      );
    },
  });
}

/**
 * Хук для удаления статьи по ID
 */
export function useDeleteArticleByIdMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    DeleteArticleResponse,
    Error,
    { id: string; url?: string }
  >({
    mutationFn: ({ id }) => articlesService.deleteArticleById(id),
    onSuccess: (_, { url }) => {
      // Инвалидируем список статей
      void queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.all });

      // Обновляем кэш проверки для этой статьи если URL известен
      if (url) {
        queryClient.setQueryData<CheckArticleResponse>(
          ARTICLES_QUERY_KEYS.check(url),
          { isSaved: false }
        );
      }
    },
  });
}

// ============================================================================
// Utils
// ============================================================================

/**
 * Утилита для инвалидации кэша статей
 */
export function useInvalidateArticles() {
  const queryClient = useQueryClient();

  return (): void => {
    void queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.all });
  };
}

/**
 * Хук для toggle сохранения статьи (сохранить/удалить)
 */
export function useToggleArticleSave(url: string) {
  const { data: checkData, isLoading: isChecking } = useCheckArticleQuery(url);
  const saveMutation = useSaveArticleMutation();
  const deleteMutation = useDeleteArticleByUrlMutation();

  const isSaved = checkData?.isSaved ?? false;
  const isToggling = saveMutation.isPending || deleteMutation.isPending;

  const toggle = (articleData?: Omit<SaveArticleDto, "url">) => {
    if (isSaved) {
      return deleteMutation.mutateAsync(url);
    }
    return saveMutation.mutateAsync({ url, ...articleData });
  };

  return {
    isSaved,
    isChecking,
    isToggling,
    toggle,
    error: saveMutation.error || deleteMutation.error,
  };
}

/**
 * TanStack Query хуки для подписки на организаторов (USER)
 * POST /api/v1/organizations/:id/follow, DELETE .../unfollow
 * GET /api/v1/organizations/:id/is-following
 * GET /api/v1/account/me/following-organizations
 */

import {
  useQuery,
  useQueryClient,
  useMutation,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useLocale } from "@eventflow/i18n/react";

import {
  organizationPublicService,
  ORGANIZATION_PUBLIC_QUERY_KEYS,
  type OrganizationPublicProfile,
  type CreateContactRequestDto,
} from "@shared/api";
import { ApiError, isAuthenticated } from "@shared/lib/apiClient";

/** Сообщение для тоста при ошибке follow/unfollow (401 → войти) */
export function getOrganizationFollowErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Войдите, чтобы подписаться на организатора.";
  }
  if (error instanceof Error) return error.message;
  return "Не удалось выполнить действие.";
}

// ============================================================================
// Public Profile Query (публичный — доступен без авторизации)
// ============================================================================

export function useOrganizationPublicProfileQuery(
  organizationId: string,
  options?: { enabled?: boolean }
): UseQueryResult<OrganizationPublicProfile, Error> {
  const locale = useLocale();

  return useQuery({
    queryKey: [
      ...ORGANIZATION_PUBLIC_QUERY_KEYS.profile(organizationId),
      locale,
    ],
    queryFn: () =>
      organizationPublicService.getPublicProfile(organizationId, locale),
    staleTime: 2 * 60 * 1000,
    enabled: (options?.enabled ?? true) && Boolean(organizationId),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

// ============================================================================
// Is Following Query
// ============================================================================

export function useIsFollowingQuery(
  organizationId: string,
  options?: { enabled?: boolean }
): UseQueryResult<{ isFollowing: boolean }, Error> {
  const isAuth = typeof window !== "undefined" && isAuthenticated();

  return useQuery({
    queryKey: ORGANIZATION_PUBLIC_QUERY_KEYS.isFollowing(organizationId),
    queryFn: () => organizationPublicService.isFollowing(organizationId),
    staleTime: 60 * 1000,
    enabled: (options?.enabled ?? true) && Boolean(organizationId) && isAuth,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

// ============================================================================
// Follow / Unfollow Mutations
// ============================================================================

type IsFollowingSnapshot = { isFollowing: boolean } | undefined;

export function useFollowOrganizationMutation(): UseMutationResult<
  { success?: boolean },
  Error,
  string,
  { previous: IsFollowingSnapshot }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["organization-public", "follow"],
    mutationFn: (organizationId: string) =>
      organizationPublicService.follow(organizationId),
    onMutate: async (organizationId) => {
      const key = ORGANIZATION_PUBLIC_QUERY_KEYS.isFollowing(organizationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous =
        queryClient.getQueryData<{ isFollowing: boolean }>(key);
      queryClient.setQueryData<{ isFollowing: boolean }>(key, {
        isFollowing: true,
      });
      return { previous };
    },
    onError: (_err, organizationId, context) => {
      if (!context) return;
      queryClient.setQueryData(
        ORGANIZATION_PUBLIC_QUERY_KEYS.isFollowing(organizationId),
        context.previous
      );
    },
    onSettled: (_data, _err, organizationId) => {
      void queryClient.invalidateQueries({
        queryKey: ORGANIZATION_PUBLIC_QUERY_KEYS.isFollowing(organizationId),
      });
    },
  });
}

export function useUnfollowOrganizationMutation(): UseMutationResult<
  { success?: boolean },
  Error,
  string,
  { previous: IsFollowingSnapshot }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["organization-public", "unfollow"],
    mutationFn: (organizationId: string) =>
      organizationPublicService.unfollow(organizationId),
    onMutate: async (organizationId) => {
      const key = ORGANIZATION_PUBLIC_QUERY_KEYS.isFollowing(organizationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous =
        queryClient.getQueryData<{ isFollowing: boolean }>(key);
      queryClient.setQueryData<{ isFollowing: boolean }>(key, {
        isFollowing: false,
      });
      return { previous };
    },
    onError: (_err, organizationId, context) => {
      if (!context) return;
      queryClient.setQueryData(
        ORGANIZATION_PUBLIC_QUERY_KEYS.isFollowing(organizationId),
        context.previous
      );
    },
    onSettled: (_data, _err, organizationId) => {
      void queryClient.invalidateQueries({
        queryKey: ORGANIZATION_PUBLIC_QUERY_KEYS.isFollowing(organizationId),
      });
    },
  });
}

// ============================================================================
// Contact organization (подача заявки на контакт)
// ============================================================================

export function useContactOrganizationMutation(): UseMutationResult<
  { message?: string },
  Error,
  { organizationId: string; data: CreateContactRequestDto }
> {
  return useMutation({
    mutationKey: ["organization-public", "contact"],
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateContactRequestDto;
    }) => organizationPublicService.contact(organizationId, data),
  });
}

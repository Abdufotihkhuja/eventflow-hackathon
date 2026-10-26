/**
 * TanStack Query хуки для приглашений в команду организации.
 * GET  /api/v1/organizations/invites/mine
 * POST /api/v1/organizations/invites/mine/{inviteId}/accept
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  myOrganizationsService,
  organizationInvitesService,
  MY_ORGANIZATIONS_QUERY_KEY,
  ORGANIZATION_INVITES_QUERY_KEYS,
  type AcceptMyInviteResult,
  type MyInvite,
  type MyOrganizationSummary,
} from "@shared/api/organizationInvitesService";
import { ApiError, isAuthenticated } from "@shared/lib/apiClient";

export { ORGANIZATION_INVITES_QUERY_KEYS, MY_ORGANIZATIONS_QUERY_KEY };
export type { MyInvite, AcceptMyInviteResult, MyOrganizationSummary };

/**
 * Приглашения текущего пользователя. Запрос идёт только у авторизованных:
 * у анонимов эндпоинт вернул бы 401 на каждой странице кабинета.
 */
export function useMyOrganizationInvitesQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<MyInvite[], Error> {
  return useQuery({
    queryKey: ORGANIZATION_INVITES_QUERY_KEYS.mine(),
    queryFn: () => organizationInvitesService.getMyInvites(),
    enabled: (options?.enabled ?? true) && isAuthenticated(),
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

/** Принятие приглашения из кабинета. */
export function useAcceptMyOrganizationInviteMutation(): UseMutationResult<
  AcceptMyInviteResult,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      organizationInvitesService.acceptInvite(inviteId),
    onSuccess: () => {
      // Принятое приглашение уходит из списка, а у аккаунта появляется
      // организация — обе выборки протухли.
      void queryClient.invalidateQueries({
        queryKey: ORGANIZATION_INVITES_QUERY_KEYS.mine(),
      });
      void queryClient.invalidateQueries({
        queryKey: MY_ORGANIZATIONS_QUERY_KEY,
      });
    },
  });
}

/** Отказ от приглашения. Комментарий необязателен. */
export function useDeclineMyOrganizationInviteMutation(): UseMutationResult<
  void,
  Error,
  { inviteId: string; reason?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteId, reason }) =>
      organizationInvitesService.declineInvite(inviteId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ORGANIZATION_INVITES_QUERY_KEYS.mine(),
      });
    },
  });
}

/**
 * Организации аккаунта. Нужны, чтобы из личного кабинета был виден вход в
 * рабочее пространство: после принятия приглашения человек — и участник, и
 * сотрудник, и должен уметь переключаться между этими ролями.
 */
export function useMyOrganizationsQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<MyOrganizationSummary[], Error> {
  return useQuery({
    queryKey: MY_ORGANIZATIONS_QUERY_KEY,
    queryFn: () => myOrganizationsService.list(),
    enabled: (options?.enabled ?? true) && isAuthenticated(),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

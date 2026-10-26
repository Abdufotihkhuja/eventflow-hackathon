/**
 * TanStack Query хуки для работы с ролями организации
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  organizationRolesService,
  permissionsService,
  ORGANIZATION_ROLES_QUERY_KEYS,
  type OrganizationRole,
  type CreateRoleDto,
  type UpdateRoleDto,
  type PermissionGroup,
} from "@shared/api/organizationRolesService";

// ==================== РОЛИ ====================

/**
 * Хук для получения списка ролей организации
 * GET /api/v1/organizations/roles
 */
export const useOrganizationRolesQuery = (options?: {
  enabled?: boolean;
}): UseQueryResult<OrganizationRole[], Error> => {
  return useQuery<OrganizationRole[], Error>({
    queryKey: ORGANIZATION_ROLES_QUERY_KEYS.list,
    queryFn: () => organizationRolesService.findAll(),
    staleTime: 10 * 60 * 1000, // 10 минут
    enabled: options?.enabled ?? true,
  });
};

/**
 * Хук для получения роли по ID
 * GET /api/v1/organizations/roles/{roleId}
 */
export const useOrganizationRoleQuery = (
  roleId: string,
  options?: { enabled?: boolean }
): UseQueryResult<OrganizationRole, Error> => {
  return useQuery<OrganizationRole, Error>({
    queryKey: ORGANIZATION_ROLES_QUERY_KEYS.detail(roleId),
    queryFn: () => organizationRolesService.findOne(roleId),
    enabled: options?.enabled ?? !!roleId,
  });
};

/**
 * Хук для создания роли
 * POST /api/v1/organizations/roles
 */
export const useCreateRoleMutation = (): UseMutationResult<
  OrganizationRole,
  Error,
  CreateRoleDto
> => {
  const queryClient = useQueryClient();

  return useMutation<OrganizationRole, Error, CreateRoleDto>({
    mutationFn: (data) => organizationRolesService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ORGANIZATION_ROLES_QUERY_KEYS.list,
      });
    },
  });
};

/**
 * Хук для обновления роли
 * PATCH /api/v1/organizations/roles/{roleId}
 */
export const useUpdateRoleMutation = (): UseMutationResult<
  OrganizationRole,
  Error,
  { roleId: string; data: UpdateRoleDto }
> => {
  const queryClient = useQueryClient();

  return useMutation<
    OrganizationRole,
    Error,
    { roleId: string; data: UpdateRoleDto }
  >({
    mutationFn: ({ roleId, data }) =>
      organizationRolesService.update(roleId, data),
    onSuccess: (updatedRole, { roleId }) => {
      queryClient.setQueryData(
        ORGANIZATION_ROLES_QUERY_KEYS.detail(roleId),
        updatedRole
      );
      void queryClient.invalidateQueries({
        queryKey: ORGANIZATION_ROLES_QUERY_KEYS.list,
      });
    },
  });
};

/**
 * Хук для удаления роли
 * DELETE /api/v1/organizations/roles/{roleId}
 */
export const useDeleteRoleMutation = (): UseMutationResult<
  { message: string },
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (roleId) => organizationRolesService.delete(roleId),
    onSuccess: (_, roleId) => {
      queryClient.removeQueries({
        queryKey: ORGANIZATION_ROLES_QUERY_KEYS.detail(roleId),
      });
      void queryClient.invalidateQueries({
        queryKey: ORGANIZATION_ROLES_QUERY_KEYS.list,
      });
    },
  });
};

// ==================== ПРАВА ====================

/**
 * Хук для получения списка всех доступных прав
 * GET /api/v1/permissions
 */
export const usePermissionsQuery = (options?: {
  enabled?: boolean;
}): UseQueryResult<PermissionGroup[], Error> => {
  return useQuery<PermissionGroup[], Error>({
    queryKey: ORGANIZATION_ROLES_QUERY_KEYS.permissions,
    queryFn: () => permissionsService.findAll(),
    staleTime: 30 * 60 * 1000, // 30 минут - права меняются редко
    enabled: options?.enabled ?? true,
  });
};

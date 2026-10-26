/**
 * Хуки для управления пользователями (Super Admin)
 * Endpoints: GET /api/v1/super-admin/users, GET /users/:userId, PATCH /users/:userId, DELETE /users/:userId
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type {
  GetAdminUsersParams,
  GetAdminUsersResponse,
  UpdateAdminUserRequest,
} from '@api/services/superAdmin.types'

import { getApiErrorMessage } from './api-error'
import { SYSTEM_STATS_QUERY_KEY } from './use-system-stats'

export const ADMIN_USERS_QUERY_KEY = ['super-admin', 'users'] as const
export const ADMIN_USER_QUERY_KEY = ['super-admin', 'user'] as const

// ================================
// Query: список пользователей
// ================================

export function useAdminUsers(params?: GetAdminUsersParams) {
  return useQuery<GetAdminUsersResponse>({
    queryKey: [...ADMIN_USERS_QUERY_KEY, params],
    queryFn: () => superAdminService.getUsers(params),
    staleTime: 30 * 1000,
  })
}

// ================================
// Query: пользователь по ID
// ================================

export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: [...ADMIN_USER_QUERY_KEY, userId],
    queryFn: () => superAdminService.getUser(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

// ================================
// Mutation: обновить пользователя
// ================================

export function useUpdateAdminUser() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateAdminUserRequest }) =>
      superAdminService.updateUser(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_USER_QUERY_KEY, userId] })
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.userUpdated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.userUpdateError'))
    },
  })
}

// ================================
// Mutation: архивировать пользователя (POST /users/:userId/archive)
// ================================

export function useArchiveAdminUser() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      superAdminService.archiveUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.userArchived'))
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('admin.toasts.userArchiveError')))
    },
  })
}

// ================================
// Mutation: восстановить пользователя (POST /users/:userId/restore)
// ================================

export function useRestoreAdminUser() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => superAdminService.restoreUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.userRestored'))
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('admin.toasts.userRestoreError')))
    },
  })
}

// ================================
// Mutation: необратимое удаление пользователя (hard delete)
// DELETE /api/v1/super-admin/users/:userId/hard-delete
// ================================

export function useHardDeleteAdminUser() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => superAdminService.hardDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.userHardDeleted'))
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('admin.toasts.userDeleteError')))
    },
  })
}

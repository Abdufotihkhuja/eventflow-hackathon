/**
 * Хуки для управления организациями (Super Admin)
 * Endpoints: GET/PATCH /organizations, GET /organizations/:orgId, approve, reject, delete
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type {
  GetAdminOrganizationsParams,
  GetAdminOrganizationsResponse,
  UpdateAdminOrganizationRequest,
} from '@api/services/superAdmin.types'

import { getApiErrorMessage } from './api-error'
import {
  ADMIN_ORGANIZATION_QUERY_KEY,
  ADMIN_ORGANIZATIONS_QUERY_KEY,
  PENDING_ORGANIZATIONS_QUERY_KEY,
  invalidateOrganizationQueries,
} from './organization-query-keys'
import { SYSTEM_STATS_QUERY_KEY } from './use-system-stats'

// ================================
// Query: список всех организаций
// ================================

export function useAdminOrganizations(params?: GetAdminOrganizationsParams) {
  return useQuery<GetAdminOrganizationsResponse>({
    queryKey: [...ADMIN_ORGANIZATIONS_QUERY_KEY, params],
    queryFn: () => superAdminService.getOrganizations(params),
    staleTime: 30 * 1000,
  })
}

// ================================
// Query: организация по ID
// ================================

export function useAdminOrganization(orgId: string | null) {
  return useQuery({
    queryKey: [...ADMIN_ORGANIZATION_QUERY_KEY, orgId],
    queryFn: () => superAdminService.getOrganization(orgId!),
    enabled: !!orgId,
    staleTime: 30 * 1000,
  })
}

// ================================
// Query: организации на верификации
// ================================

export function usePendingOrganizations(params?: GetAdminOrganizationsParams) {
  return useQuery<GetAdminOrganizationsResponse>({
    queryKey: [...PENDING_ORGANIZATIONS_QUERY_KEY, params],
    queryFn: () => superAdminService.getPendingOrganizations(params),
    staleTime: 30 * 1000,
  })
}

// ================================
// Mutation: одобрить организацию
// ================================

export function useApproveOrganization() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orgId: string) => superAdminService.approveOrganization(orgId),
    onSuccess: (_, orgId) => {
      invalidateOrganizationQueries(queryClient, orgId)
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.organizationApproved'))
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('admin.toasts.organizationApproveError')))
    },
  })
}

// ================================
// Mutation: отклонить организацию
// ================================

export function useRejectOrganization() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, reason }: { orgId: string; reason?: string }) =>
      superAdminService.rejectOrganization(orgId, { reason }),
    onSuccess: (_, { orgId }) => {
      invalidateOrganizationQueries(queryClient, orgId)
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.organizationRejected'))
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('admin.toasts.organizationRejectError')))
    },
  })
}

// ================================
// Mutation: обновить организацию
// ================================

export function useUpdateAdminOrganization() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: UpdateAdminOrganizationRequest }) =>
      superAdminService.updateOrganization(orgId, data),
    onSuccess: (_, { orgId }) => {
      invalidateOrganizationQueries(queryClient, orgId)
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.organizationUpdated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.organizationUpdateError'))
    },
  })
}

// ================================
// Query: сводка зависимостей перед hard delete
// GET /api/v1/super-admin/organizations/:orgId/delete-preview
// ================================

export const ORGANIZATION_DELETE_PREVIEW_QUERY_KEY = [
  'super-admin',
  'organization',
  'delete-preview',
] as const

export function useOrganizationDeletePreview(orgId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...ORGANIZATION_DELETE_PREVIEW_QUERY_KEY, orgId],
    queryFn: () => superAdminService.getOrganizationDeletePreview(orgId!),
    enabled: !!orgId && enabled,
    staleTime: 10 * 1000,
  })
}

// ================================
// Mutation: архивировать организацию (POST /organizations/:orgId/archive)
// ================================

export function useArchiveAdminOrganization() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, reason }: { orgId: string; reason?: string }) =>
      superAdminService.archiveOrganization(orgId, reason),
    onSuccess: (_, { orgId }) => {
      invalidateOrganizationQueries(queryClient, orgId)
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.organizationArchived'))
    },
    onError: (error: unknown) => {
      toast.error(
        getApiErrorMessage(error, t('admin.toasts.organizationArchiveError'))
      )
    },
  })
}

// ================================
// Mutation: восстановить организацию (POST /organizations/:orgId/restore)
// ================================

export function useRestoreAdminOrganization() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orgId: string) => superAdminService.restoreOrganization(orgId),
    onSuccess: (_, orgId) => {
      invalidateOrganizationQueries(queryClient, orgId)
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.organizationRestored'))
    },
    onError: (error: unknown) => {
      toast.error(
        getApiErrorMessage(error, t('admin.toasts.organizationRestoreError'))
      )
    },
  })
}

// ================================
// Mutation: необратимое удаление организации (hard delete)
// DELETE /api/v1/super-admin/organizations/:orgId/hard-delete
// ================================

export function useHardDeleteAdminOrganization() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orgId, confirmation }: { orgId: string; confirmation: string }) =>
      superAdminService.hardDeleteOrganization(orgId, confirmation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_ORGANIZATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY })
      toast.success(t('admin.toasts.organizationHardDeleted'))
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t('admin.toasts.organizationDeleteError')))
    },
  })
}

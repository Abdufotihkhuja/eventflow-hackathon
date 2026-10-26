/**
 * Хуки для управления категориями (Super Admin)
 * Endpoints: GET/POST/PATCH/DELETE /api/v1/super-admin/categories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type { ApiError } from '@api/types'
import type {
  GetAdminCategoriesParams,
  GetAdminCategoriesResponse,
  CreateAdminCategoryRequest,
  UpdateAdminCategoryRequest,
} from '@api/services/superAdmin.types'

function getApiErrorMessage(error: unknown): string {
  const apiError = error as ApiError | undefined
  return apiError?.message ?? 'Произошла ошибка'
}

export const ADMIN_CATEGORIES_QUERY_KEY = ['super-admin', 'categories'] as const
export const ADMIN_CATEGORY_QUERY_KEY = ['super-admin', 'category'] as const
export const CHECK_CATEGORY_SLUG_QUERY_KEY = ['super-admin', 'categories', 'check-slug'] as const

/** Допустимые символы slug по API: a-z, 0-9, дефис */
export const SLUG_VALID_REGEX = /^[a-z0-9-]+$/

export function useAdminCategories(params?: GetAdminCategoriesParams) {
  return useQuery<GetAdminCategoriesResponse>({
    queryKey: [...ADMIN_CATEGORIES_QUERY_KEY, params],
    queryFn: () => superAdminService.getCategories(params),
    staleTime: 30 * 1000,
  })
}

export function useAdminCategory(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_CATEGORY_QUERY_KEY, id],
    queryFn: () => superAdminService.getCategory(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/** Проверка доступности slug (GET check-slug). Вызывать с debounced значением. */
export function useCheckCategorySlug(debouncedSlug: string, excludeId?: string) {
  const slugTrim = debouncedSlug.trim().toLowerCase()
  const isValidFormat = SLUG_VALID_REGEX.test(slugTrim)

  return useQuery({
    queryKey: [...CHECK_CATEGORY_SLUG_QUERY_KEY, slugTrim, excludeId],
    queryFn: () =>
      superAdminService.checkCategorySlug({ slug: slugTrim, excludeId: excludeId || undefined }),
    enabled: slugTrim.length > 0 && isValidFormat,
    staleTime: 60 * 1000,
  })
}

export function useCreateAdminCategory() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAdminCategoryRequest) => superAdminService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'categories'] })
      toast.success(t('admin.toasts.categoryCreated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.categoryCreateError'))
    },
  })
}

export function useUpdateAdminCategory() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminCategoryRequest }) =>
      superAdminService.updateCategory(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'categories'] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_CATEGORY_QUERY_KEY, id] })
      toast.success(t('admin.toasts.categoryUpdated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.categoryUpdateError'))
    },
  })
}

export function useUploadCategoryIcon() {
  return useMutation({
    mutationFn: (file: File) => superAdminService.uploadCategoryIcon(file),
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}

export function useDeleteAdminCategory() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => superAdminService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'categories'] })
      toast.success(t('admin.toasts.categoryDeleted'))
    },
    onError: () => {
      toast.error(t('admin.toasts.categoryDeleteError'))
    },
  })
}

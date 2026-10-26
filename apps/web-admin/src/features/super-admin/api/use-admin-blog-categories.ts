/**
 * Хуки для управления категориями блога (Super Admin)
 * Endpoints: GET/POST/PATCH/DELETE /api/v1/super-admin/blog-categories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type {
  GetAdminBlogCategoriesParams,
  GetAdminBlogCategoriesResponse,
  CreateAdminBlogCategoryRequest,
  UpdateAdminBlogCategoryRequest,
} from '@api/services/superAdmin.types'

export const ADMIN_BLOG_CATEGORIES_QUERY_KEY = ['super-admin', 'blog-categories'] as const
export const ADMIN_BLOG_CATEGORY_QUERY_KEY = ['super-admin', 'blog-category'] as const
export const CHECK_BLOG_CATEGORY_SLUG_QUERY_KEY = [
  'super-admin',
  'blog-categories',
  'check-slug',
] as const

/** Допустимые символы slug по API: a-z, 0-9, дефис */
export const SLUG_VALID_REGEX = /^[a-z0-9-]+$/

export function useAdminBlogCategories(params?: GetAdminBlogCategoriesParams) {
  return useQuery<GetAdminBlogCategoriesResponse>({
    queryKey: [...ADMIN_BLOG_CATEGORIES_QUERY_KEY, params],
    queryFn: () => superAdminService.getBlogCategories(params),
    staleTime: 30 * 1000,
  })
}

export function useAdminBlogCategory(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_BLOG_CATEGORY_QUERY_KEY, id],
    queryFn: () => superAdminService.getBlogCategory(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/** Проверка доступности slug (GET check-slug). Вызывать с debounced значением. */
export function useCheckBlogCategorySlug(debouncedSlug: string, excludeId?: string) {
  const slugTrim = debouncedSlug.trim().toLowerCase()
  const isValidFormat = SLUG_VALID_REGEX.test(slugTrim)

  return useQuery({
    queryKey: [...CHECK_BLOG_CATEGORY_SLUG_QUERY_KEY, slugTrim, excludeId],
    queryFn: () =>
      superAdminService.checkBlogCategorySlug({
        slug: slugTrim,
        excludeId: excludeId || undefined,
      }),
    enabled: slugTrim.length > 0 && isValidFormat,
    staleTime: 60 * 1000,
  })
}

export function useCreateAdminBlogCategory() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAdminBlogCategoryRequest) =>
      superAdminService.createBlogCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'blog-categories'] })
      toast.success(t('admin.toasts.blogCategoryCreated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.blogCategoryCreateError'))
    },
  })
}

export function useUpdateAdminBlogCategory() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminBlogCategoryRequest }) =>
      superAdminService.updateBlogCategory(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'blog-categories'] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_BLOG_CATEGORY_QUERY_KEY, id] })
      toast.success(t('admin.toasts.blogCategoryUpdated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.blogCategoryUpdateError'))
    },
  })
}

export function useDeleteAdminBlogCategory() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => superAdminService.deleteBlogCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'blog-categories'] })
      toast.success(t('admin.toasts.blogCategoryDeleted'))
    },
    onError: () => {
      toast.error(t('admin.toasts.blogCategoryDeleteError'))
    },
  })
}

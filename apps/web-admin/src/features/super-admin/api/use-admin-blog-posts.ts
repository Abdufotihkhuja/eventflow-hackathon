/**
 * Хуки для управления блог-постами (Super Admin)
 * @module features/super-admin/api/use-admin-blog-posts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'
import { superAdminService } from '@api/services'
import type {
  AdminBlogPost,
  GetAdminBlogPostsParams,
  GetAdminBlogPostsResponse,
} from '@api/services'

import { SYSTEM_STATS_QUERY_KEY } from './use-system-stats'

export const ADMIN_BLOG_POSTS_QUERY_KEY = ['super-admin', 'blog-posts'] as const
export const ADMIN_BLOG_POST_QUERY_KEY = ['super-admin', 'blog-post'] as const
export const PENDING_BLOG_POSTS_QUERY_KEY = ['super-admin', 'blog-posts', 'pending'] as const

/**
 * Хук для получения списка всех блог-постов
 */
export function useAdminBlogPosts(params?: GetAdminBlogPostsParams) {
  return useQuery<GetAdminBlogPostsResponse>({
    queryKey: [...ADMIN_BLOG_POSTS_QUERY_KEY, params],
    queryFn: () => superAdminService.getBlogPosts(params),
    staleTime: 30 * 1000,
  })
}

/**
 * Хук для получения блог-постов на модерации
 */
export function usePendingBlogPosts(params?: GetAdminBlogPostsParams) {
  return useQuery<GetAdminBlogPostsResponse>({
    queryKey: [...PENDING_BLOG_POSTS_QUERY_KEY, params],
    queryFn: () => superAdminService.getPendingBlogPosts(params),
    staleTime: 30 * 1000,
  })
}

/**
 * Хук для получения блог-поста по ID
 */
export function useAdminBlogPost(postId: string | undefined) {
  return useQuery<AdminBlogPost>({
    queryKey: [...ADMIN_BLOG_POST_QUERY_KEY, postId],
    queryFn: () => superAdminService.getBlogPost(postId!),
    enabled: !!postId,
    staleTime: 30 * 1000,
  })
}

/**
 * Хук для одобрения блог-поста
 */
export function useApproveBlogPost() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => superAdminService.approveBlogPost(postId),
    onSuccess: async (_data, postId) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ADMIN_BLOG_POSTS_QUERY_KEY }),
        queryClient.refetchQueries({
          queryKey: PENDING_BLOG_POSTS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...ADMIN_BLOG_POST_QUERY_KEY, postId],
        }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ])
      toast.success(t('admin.toasts.blogPostApproved'))
    },
    onError: () => {
      toast.error(t('admin.toasts.blogPostApproveError'))
    },
  })
}

/**
 * Хук для отклонения блог-поста
 */
export function useRejectBlogPost() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason?: string }) =>
      superAdminService.rejectBlogPost(postId, { reason }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ADMIN_BLOG_POSTS_QUERY_KEY }),
        queryClient.refetchQueries({
          queryKey: PENDING_BLOG_POSTS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...ADMIN_BLOG_POST_QUERY_KEY, variables.postId],
        }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ])
      toast.success(t('admin.toasts.blogPostRejected'))
    },
    onError: () => {
      toast.error(t('admin.toasts.blogPostRejectError'))
    },
  })
}

/**
 * Хук для удаления блог-поста
 */
export function useDeleteBlogPost() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => superAdminService.deleteBlogPost(postId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ADMIN_BLOG_POSTS_QUERY_KEY }),
        queryClient.refetchQueries({
          queryKey: PENDING_BLOG_POSTS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({ queryKey: SYSTEM_STATS_QUERY_KEY }),
      ])
      toast.success(t('admin.toasts.blogPostDeleted'))
    },
    onError: () => {
      toast.error(t('admin.toasts.blogPostDeleteError'))
    },
  })
}

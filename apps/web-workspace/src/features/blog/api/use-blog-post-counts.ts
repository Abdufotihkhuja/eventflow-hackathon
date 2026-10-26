/**
 * Real per-status article counts for the blog management surface.
 *
 * The list endpoint is the only source of truth, so we read the real `total`
 * of a status-scoped query (limit 1) per status. Queries are tenant-scoped by
 * the API, run in parallel and are cached by TanStack Query. The overall total
 * is the sum of the per-status totals (the status set is exhaustive).
 * @module features/blog/api/use-blog-post-counts
 */

import { useQueries } from '@tanstack/react-query'

import { blogPostsService, type BlogPostStatus } from '@api/services'

import { blogPostsKeys } from './use-blog-posts'

const COUNTED_STATUSES: BlogPostStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
]

export type BlogPostCounts = {
  total: number
  byStatus: Record<BlogPostStatus, number>
  isLoading: boolean
}

export function useBlogPostCounts(): BlogPostCounts {
  const results = useQueries({
    queries: COUNTED_STATUSES.map(status => {
      const params = { status, page: 1, limit: 1 }
      return {
        queryKey: blogPostsKeys.list(params),
        queryFn: () => blogPostsService.getAll(params),
        staleTime: 30_000,
      }
    }),
  })

  const byStatus = COUNTED_STATUSES.reduce(
    (acc, status, index) => {
      acc[status] = results[index]?.data?.total ?? 0
      return acc
    },
    {} as Record<BlogPostStatus, number>
  )

  const total = COUNTED_STATUSES.reduce((sum, status) => sum + byStatus[status], 0)
  const isLoading = results.some(result => result.isLoading)

  return { total, byStatus, isLoading }
}

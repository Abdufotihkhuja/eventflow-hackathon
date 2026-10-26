/**
 * Super Admin — страница управления блог-постами
 * @module pages/super-admin/blog-posts/ui/blog-posts-page
 */

import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PaginationState } from '@tanstack/react-table'
import { useLocale, useT } from '@eventflow/i18n/react'
import { translateOptions } from '@eventflow/i18n'
import type { AdminBlogPost, AdminBlogPostStatus } from '@api/services'
import {
  useAdminBlogPosts,
  useApproveBlogPost,
  useRejectBlogPost,
  useDeleteBlogPost,
} from '@features/super-admin'
import { PUBLIC_SITE_URL } from '@api/config'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DataTable,
  ErrorState,
  FilterToolbar,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shared/ui'

import { createBlogPostsColumns } from './blog-posts-columns'

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allStatuses' },
  { value: 'DRAFT', labelKey: 'admin.statuses.draft' },
  { value: 'PENDING_REVIEW', labelKey: 'admin.statuses.pendingModeration' },
  { value: 'APPROVED', labelKey: 'admin.statuses.approved' },
  { value: 'REJECTED', labelKey: 'admin.statuses.rejected' },
  { value: 'PUBLISHED', labelKey: 'admin.statuses.published' },
] as const

const SORT_OPTIONS = [
  { value: 'createdAt', labelKey: 'admin.blogPosts.sortCreatedAt' },
  { value: 'publishedAt', labelKey: 'admin.blogPosts.sortPublishedAt' },
  { value: 'likesCount', labelKey: 'admin.blogPosts.sortLikes' },
  { value: 'viewsCount', labelKey: 'admin.blogPosts.sortViews' },
] as const

// Безопасное преобразование в строку
function safeString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export default function SuperAdminBlogPostsPage() {
  const t = useT()
  const locale = useLocale()
  const navigate = useNavigate()
  // Фильтры
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'publishedAt' | 'likesCount' | 'viewsCount'>(
    'createdAt'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Пагинация
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Dialogs state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<AdminBlogPost | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // API
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: search || undefined,
      status: status !== 'all' ? (status as AdminBlogPostStatus) : undefined,
      sortBy,
      sortOrder,
    }),
    [pagination.pageIndex, pagination.pageSize, search, status, sortBy, sortOrder]
  )

  const { data, isLoading, error, refetch } = useAdminBlogPosts(queryParams)

  const approveMutation = useApproveBlogPost()
  const rejectMutation = useRejectBlogPost()
  const deleteMutation = useDeleteBlogPost()

  const isPending =
    approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending

  // Handlers
  const handleRowClick = useCallback(
    (post: AdminBlogPost) => {
      navigate(`/admin/blog-posts/${post.id}`)
    },
    [navigate]
  )

  const handleView = useCallback((post: AdminBlogPost) => {
    const slug = typeof post.slug === 'string' ? post.slug : ''
    if (slug) {
      const base = PUBLIC_SITE_URL.replace(/\/$/, '')
      window.open(`${base}/blog/${slug}`, '_blank')
    }
  }, [])

  const handleApprove = useCallback(
    (post: AdminBlogPost) => {
      approveMutation.mutate(post.id)
    },
    [approveMutation]
  )

  const handleRejectClick = useCallback((post: AdminBlogPost) => {
    setSelectedPost(post)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }, [])

  const handleRejectConfirm = useCallback(() => {
    if (!selectedPost) return
    rejectMutation.mutate(
      {
        postId: selectedPost.id,
        reason: rejectionReason || undefined,
      },
      {
        onSuccess: () => {
          setRejectDialogOpen(false)
          setSelectedPost(null)
          setRejectionReason('')
        },
      }
    )
  }, [selectedPost, rejectionReason, rejectMutation])

  const handleDeleteClick = useCallback((post: AdminBlogPost) => {
    setSelectedPost(post)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedPost) return
    deleteMutation.mutate(selectedPost.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        setSelectedPost(null)
      },
    })
  }, [selectedPost, deleteMutation])

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatus('all')
    setSortBy('createdAt')
    setSortOrder('desc')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const hasFilters = search || status !== 'all'
  const statusOptions = useMemo(() => translateOptions(STATUS_OPTIONS, t), [t])
  const sortOptions = useMemo(() => translateOptions(SORT_OPTIONS, t), [t])

  // Безопасно обработанные данные
  const safeData = useMemo(() => {
    if (!data?.data || !Array.isArray(data.data)) return []

    return data.data
      .filter(post => post && typeof post === 'object' && post !== null)
      .map(post => {
        const safePost: AdminBlogPost = {
          id: safeString(post.id),
          organizationId: safeString(post.organizationId),
          title: safeString(post.title),
          slug: safeString(post.slug),
          status: (safeString(post.status) || 'DRAFT') as AdminBlogPostStatus,
          viewsCount: typeof post.viewsCount === 'number' ? post.viewsCount : 0,
          likesCount: typeof post.likesCount === 'number' ? post.likesCount : 0,
          commentsCount: typeof post.commentsCount === 'number' ? post.commentsCount : 0,
          readingTime: typeof post.readingTime === 'number' ? post.readingTime : 0,
          commentsEnabled: Boolean(post.commentsEnabled),
          organization:
            post.organization &&
            typeof post.organization === 'object' &&
            !Array.isArray(post.organization)
              ? {
                  id: safeString(post.organization.id),
                  name: safeString(post.organization.name),
                  companyName: safeString(post.organization.companyName),
                  email: safeString(post.organization.email),
                  logoUrl: post.organization.logoUrl ? safeString(post.organization.logoUrl) : null,
                }
              : {
                  id: '',
                  name: '',
                  companyName: '',
                  email: '',
                  logoUrl: null,
                },
          tags: Array.isArray(post.tags)
            ? post.tags
                .filter(tag => tag && typeof tag === 'object' && !Array.isArray(tag))
                .map(tag => ({
                  id: safeString(tag.id),
                  name: safeString(tag.name),
                  slug: safeString(tag.slug),
                }))
            : [],
          coverImage: post.coverImage ? safeString(post.coverImage) : undefined,
          shortDescription: post.shortDescription ? safeString(post.shortDescription) : undefined,
          rejectionMessage: post.rejectionMessage ? safeString(post.rejectionMessage) : undefined,
          createdAt: safeString(post.createdAt),
          updatedAt: safeString(post.updatedAt),
          publishedAt: post.publishedAt ? safeString(post.publishedAt) : undefined,
          reviewedAt: post.reviewedAt ? safeString(post.reviewedAt) : undefined,
        }
        return safePost
      })
  }, [data])

  // Columns
  const columns = useMemo(
    () =>
      createBlogPostsColumns({
        t,
        locale,
        onView: handleView,
        onApprove: handleApprove,
        onReject: handleRejectClick,
        onDelete: handleDeleteClick,
        onRowClick: handleRowClick,
      }),
    [handleView, handleApprove, handleRejectClick, handleDeleteClick, handleRowClick, locale, t]
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState
          title={t('admin.blogPosts.loadError')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      )}

      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('admin.filters.searchByTitle')}
        hasFilters={hasFilters}
        onReset={clearFilters}
        resetLabel={t('admin.actions.reset')}
        filters={
          <>
            <Select
              value={status}
              onValueChange={v => {
                setStatus(v)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
            >
              <SelectTrigger className="h-9 w-[160px]" aria-label={t('admin.tables.columns.status')}>
                <SelectValue placeholder={t('admin.tables.columns.status')} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value: 'createdAt' | 'publishedAt' | 'likesCount' | 'viewsCount') => {
                setSortBy(value)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
            >
              <SelectTrigger className="h-9 w-[180px]" aria-label={t('admin.filters.sort')}>
                <SelectValue placeholder={t('admin.filters.sort')} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(value: 'asc' | 'desc') => {
                setSortOrder(value)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
            >
              <SelectTrigger className="h-9 w-[140px]" aria-label={t('admin.filters.sort')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{t('admin.filters.descending')}</SelectItem>
                <SelectItem value="asc">{t('admin.filters.ascending')}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        footer={
          data
            ? t('admin.tables.resultsFound', {
                count: data.total,
                entity: t('admin.tables.entities.blogPosts'),
              })
            : undefined
        }
      />

      <DataTable
        columns={columns}
        data={safeData}
        isLoading={isLoading}
        pagination={pagination}
        pageCount={data ? Math.ceil(data.total / pagination.pageSize) : 0}
        onPaginationChange={setPagination}
        emptyText={t('admin.tables.empty.blogPosts')}
      />

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.blogPosts.rejectTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.blogPosts.rejectDescription', {
                name: typeof selectedPost?.title === 'string' ? selectedPost.title : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>{t('admin.dialogs.rejectReason')}</Label>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder={t('admin.dialogs.rejectReasonPlaceholder')}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} disabled={isPending}>
              {t('admin.actions.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.blogPosts.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.blogPosts.deleteDescription', {
                name: typeof selectedPost?.title === 'string' ? selectedPost.title : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

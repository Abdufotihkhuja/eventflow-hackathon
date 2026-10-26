import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  CheckCircle2,
  Clock,
  FileEdit,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Search,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'
import { cn } from '@shared/lib/cn'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PageTabs,
  type PageTabItem,
  PaginationBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatTile,
} from '@shared/ui'
import { BlogPostCard } from '@features/blog/ui'
import { useBlogPosts, useBlogPostCounts, useDeleteBlogPost, useOrganizationTags } from '@features/blog/api'
import type { BlogPostStatus, BlogSortBy, SortOrder } from '@api/services'

import { MyBlogTable } from './my-blog-table'

type TabStatus = BlogPostStatus | 'all'
type ViewMode = 'table' | 'cards'
type SortKey = 'newest' | 'oldest' | 'publishedAt' | 'mostViewed' | 'mostLiked'

const VIEW_STORAGE_KEY = 'eventflow-blog-view'

// Direction is baked into each option (no separate order toggle) — matches the
// single-sort pattern used across the workspace list pages.
const SORT_OPTIONS: { value: SortKey; labelKey: string }[] = [
  { value: 'newest', labelKey: 'blog.sort.newest' },
  { value: 'oldest', labelKey: 'blog.sort.oldest' },
  { value: 'publishedAt', labelKey: 'blog.sort.publishedAt' },
  { value: 'mostViewed', labelKey: 'blog.sort.mostViewed' },
  { value: 'mostLiked', labelKey: 'blog.sort.likesCount' },
]

const SORT_MAP: Record<SortKey, { sortBy: BlogSortBy; sortOrder: SortOrder }> = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
  publishedAt: { sortBy: 'publishedAt', sortOrder: 'desc' },
  mostViewed: { sortBy: 'viewsCount', sortOrder: 'desc' },
  mostLiked: { sortBy: 'likesCount', sortOrder: 'desc' },
}

export function MyBlogPage() {
  const t = useT()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TabStatus>('all')
  const [tagId, setTagId] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [view, setViewState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'cards' || stored === 'table' ? stored : 'table'
  })
  const setView = (next: ViewMode) => {
    setViewState(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const counts = useBlogPostCounts()
  const { data: tags } = useOrganizationTags()
  const { data, isLoading, isError, refetch } = useBlogPosts({
    page,
    limit: 12,
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    tagId: tagId !== 'all' ? tagId : undefined,
    sortBy: SORT_MAP[sort].sortBy,
    sortOrder: SORT_MAP[sort].sortOrder,
  })

  const deleteMutation = useDeleteBlogPost()

  const posts = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const hasFilters = search.trim() !== '' || status !== 'all' || tagId !== 'all'

  const statusTabs: PageTabItem<TabStatus>[] = [
    { id: 'all', label: t('blog.myBlog.allStatuses'), count: counts.total },
    { id: 'DRAFT', label: t('blog.status.draft'), count: counts.byStatus.DRAFT },
    { id: 'PENDING_REVIEW', label: t('blog.status.pendingReview'), count: counts.byStatus.PENDING_REVIEW },
    { id: 'APPROVED', label: t('blog.status.approved'), count: counts.byStatus.APPROVED },
    { id: 'PUBLISHED', label: t('blog.status.published'), count: counts.byStatus.PUBLISHED },
    { id: 'REJECTED', label: t('blog.status.rejected'), count: counts.byStatus.REJECTED },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('blog.myBlog.title')}
        title={t('blog.myBlog.title')}
        description={t('blog.myBlog.description')}
        actions={
          <Button asChild size="sm">
            <Link to="/my-blog/new">
              <Plus className="mr-1.5 size-4" />
              {t('blog.myBlog.createPost')}
            </Link>
          </Button>
        }
        bottom={
          <PageTabs
            items={statusTabs}
            active={status}
            onChange={next => {
              setStatus(next)
              setPage(1)
            }}
          />
        }
      />

      {counts.total > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label={t('blog.myBlog.totalPosts')} value={counts.total} icon={FileText} />
          <StatTile
            label={t('blog.myBlog.pendingReview')}
            value={counts.byStatus.PENDING_REVIEW}
            icon={Clock}
            tone="warning"
          />
          <StatTile
            label={t('blog.myBlog.published')}
            value={counts.byStatus.PUBLISHED}
            icon={CheckCircle2}
            tone="positive"
          />
          <StatTile label={t('blog.myBlog.drafts')} value={counts.byStatus.DRAFT} icon={FileEdit} />
        </div>
      )}

      {/* Filter bar — search · tag · sort · view (one rhythm, mirrors /my-events) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('blog.myBlog.searchPlaceholder')}
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="h-10 pl-9"
            aria-label={t('blog.myBlog.searchPlaceholder')}
          />
        </div>

        {tags && tags.length > 0 && (
          <Select
            value={tagId}
            onValueChange={value => {
              setTagId(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[170px]" aria-label={t('blog.myBlog.allTags')}>
              <SelectValue placeholder={t('blog.myBlog.allTags')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('blog.myBlog.allTags')}</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={sort}
          onValueChange={value => {
            setSort(value as SortKey)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-10 w-full sm:w-[190px]" aria-label={t('blog.myBlog.sortPlaceholder')}>
            <ArrowUpDown className="mr-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder={t('blog.myBlog.sortPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-md border border-border bg-background p-1 sm:ml-auto">
          <ViewToggleButton
            active={view === 'table'}
            onClick={() => setView('table')}
            label={t('blog.myBlog.viewTable')}
          >
            <List className="size-4" />
          </ViewToggleButton>
          <ViewToggleButton
            active={view === 'cards'}
            onClick={() => setView('cards')}
            label={t('blog.myBlog.viewCards')}
          >
            <LayoutGrid className="size-4" />
          </ViewToggleButton>
        </div>
      </div>

      {isLoading && <LoadingState />}

      {isError && !isLoading && (
        <ErrorState
          title={t('blog.myBlog.errorTitle')}
          description={t('blog.myBlog.errorDescription')}
          onRetry={() => refetch()}
          retryLabel={t('actions.retry')}
        />
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <Card>
          <EmptyState
            icon={FileText}
            title={hasFilters ? t('blog.myBlog.noResultsTitle') : t('blog.myBlog.emptyTitle')}
            description={
              hasFilters ? t('blog.myBlog.noResultsDescription') : t('blog.myBlog.emptyDescription')
            }
            action={
              hasFilters
                ? undefined
                : {
                    label: t('blog.myBlog.createPost'),
                    asChild: true,
                    children: (
                      <Link to="/my-blog/new">
                        <Plus className="mr-2 size-4" />
                        {t('blog.myBlog.createPost')}
                      </Link>
                    ),
                  }
            }
          />
        </Card>
      )}

      {!isLoading && !isError && posts.length > 0 && (
        <div className="space-y-4">
          {view === 'table' ? (
            <MyBlogTable
              posts={posts}
              getPostHref={post => `/my-blog/${post.id}`}
              getEditHref={post => `/my-blog/${post.id}/edit`}
              onDelete={postId => deleteMutation.mutate(postId)}
              isDeleteLoading={deleteMutation.isPending}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map(post => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  href={`/my-blog/${post.id}`}
                  editHref={`/my-blog/${post.id}/edit`}
                  showStatus
                  onDelete={postId => deleteMutation.mutate(postId)}
                  isDeleteLoading={deleteMutation.isPending}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[12px] text-muted-foreground">
              {t('blog.myBlog.showingCount', { shown: posts.length, total })}
            </p>
            {totalPages > 1 && (
              <PaginationBar
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                previousLabel={t('actions.previous')}
                nextLabel={t('actions.next')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ViewToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

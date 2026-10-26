/**
 * Страница подписчиков организации
 * API: /api/v1/organizations/followers
 */

import { useState, useMemo } from 'react'
import { Search, Users as UsersIcon } from 'lucide-react'
import { formatDate } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import { useFollowersQuery, useFollowersStatsQuery } from '@features/organization-followers'
import { cn } from '@shared/lib/cn'
import { Card, Input, Avatar, AvatarFallback, AvatarImage } from '@shared/ui'

function FollowersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <div className="size-12 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function FollowersPage() {
  const t = useT()
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data: statsData } = useFollowersStatsQuery()
  const { data: followersResponse, isLoading } = useFollowersQuery({
    page,
    limit,
    search: search || undefined,
  })

  const followers = useMemo(() => {
    if (!followersResponse) return []
    return Array.isArray(followersResponse) ? followersResponse : followersResponse.data ?? []
  }, [followersResponse])

  const total = useMemo(() => {
    if (!followersResponse || Array.isArray(followersResponse)) return followers.length
    return followersResponse.total ?? 0
  }, [followersResponse, followers.length])

  const totalPages =
    followersResponse && !Array.isArray(followersResponse)
      ? followersResponse.totalPages
      : Math.ceil(total / limit) || 1

  if (isLoading && !followersResponse) {
    return <FollowersPageSkeleton />
  }

  const statsTotal = typeof statsData === 'object' && statsData !== null && 'total' in statsData
    ? (statsData as { total: number }).total
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.followers.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.followers.description')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <UsersIcon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.followers.statsTotal')}</p>
              <p className="text-2xl font-semibold tabular-nums">{statsTotal}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('admin.followers.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {followers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <UsersIcon className="size-12 opacity-50" />
            <p className="mt-2 font-medium">{t('admin.followers.emptyTitle')}</p>
            <p className="mt-1 text-sm">{t('admin.followers.emptyDescription')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {followers.map(follower => {
              const displayName =
                [follower.firstName, follower.lastName].filter(Boolean).join(' ').trim() ||
                t('admin.followers.unnamed')
              const initials = displayName
                .split(/\s+/)
                .map(s => s[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || '?'
              return (
                <li key={follower.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <Avatar className="size-12">
                    <AvatarImage src={getMediaUrl(follower.avatarUrl)} alt={displayName} />
                    <AvatarFallback className="bg-muted text-sm">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{displayName}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm text-muted-foreground">
                    {t('admin.followers.followedAt', {
                      date: formatDate(follower.followedAt, locale),
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {t('admin.tables.pagination.page', { page, total: totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  page <= 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted'
                )}
              >
                {t('actions.previous')}
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  page >= totalPages ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted'
                )}
              >
                {t('actions.next')}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

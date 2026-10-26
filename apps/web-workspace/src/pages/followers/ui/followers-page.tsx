/**
 * Страница подписчиков организации
 * API: /api/v1/organizations/followers
 */

import { useState, useMemo } from 'react'
import { Download, ExternalLink, Search, Users as UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl, PUBLIC_SITE_URL } from '@api/config'
import { organizationsService, type Follower } from '@api/services'
import { useCurrentUser, isOrganizationUser } from '@features/profile'
import { useFollowersQuery, useFollowersStatsQuery } from '@features/organization-followers'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  PaginationBar,
  StatTile,
} from '@shared/ui'
import { formatDate } from '@shared/lib'

const EXPORT_PAGE_SIZE = 100

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`

function followerName(follower: Follower, fallback: string) {
  return [follower.firstName, follower.lastName].filter(Boolean).join(' ').trim() || fallback
}

function FollowersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded-lg border border-border bg-card sm:max-w-xs" />
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="size-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FollowersPage() {
  const t = useT()
  const { data: currentUser } = useCurrentUser()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
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

  const statsTotal = statsData?.total ?? 0

  const organization = isOrganizationUser(currentUser) ? currentUser.data : null
  const publicProfileUrl = organization
    ? `${PUBLIC_SITE_URL.replace(/\/$/, '')}/organizers/${organization.id}`
    : null

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const all: Follower[] = []
      let nextPage = 1
      for (;;) {
        const res = await organizationsService.getFollowers({ page: nextPage, limit: EXPORT_PAGE_SIZE })
        const batch = Array.isArray(res) ? res : (res.data ?? [])
        all.push(...batch)
        const pages = Array.isArray(res) ? 1 : (res.totalPages ?? 1)
        if (batch.length === 0 || nextPage >= pages) break
        nextPage += 1
      }

      if (all.length === 0) {
        toast.error(t('workspace.followers.exportEmpty'))
        return
      }

      const header = [t('workspace.followers.colSubscriber'), t('workspace.followers.colFollowed')]
      const lines = all.map(f =>
        [followerName(f, t('workspace.followers.unnamed')), formatDate(f.followedAt)]
          .map(csvCell)
          .join(',')
      )
      const csv = `﻿${[header.map(csvCell).join(','), ...lines].join('\n')}`

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('workspace.followers.exportError'))
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading && !followersResponse) {
    return <FollowersPageSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('workspace.followers.title')}
        description={t('workspace.followers.description')}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              isLoading={isExporting}
              disabled={statsTotal === 0}
            >
              <Download className="mr-1.5 size-4" />
              {isExporting ? t('workspace.followers.exporting') : t('workspace.followers.export')}
            </Button>
            {publicProfileUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={publicProfileUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="size-4" />
                  {t('workspace.layout.navbar.viewPublicProfile')}
                </a>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:max-w-xs">
        <StatTile
          label={t('workspace.followers.statsTotal')}
          value={statsTotal}
          icon={UsersIcon}
        />
      </div>

      <div className="relative sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder={t('workspace.followers.searchPlaceholder')}
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="h-10 pl-9"
          aria-label={t('workspace.followers.searchPlaceholder')}
        />
      </div>

      {followers.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title={t('workspace.followers.emptyTitle')}
            description={t('workspace.followers.emptyDescription')}
            action={
              publicProfileUrl
                ? {
                    label: t('workspace.layout.navbar.viewPublicProfile'),
                    asChild: true,
                    variant: 'outline',
                    children: (
                      <a href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 size-4" />
                        {t('workspace.layout.navbar.viewPublicProfile')}
                      </a>
                    ),
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('workspace.followers.colSubscriber')}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('workspace.followers.colFollowed')}
            </span>
          </div>
          {followers.map(follower => {
            const displayName = followerName(follower, t('workspace.followers.unnamed'))
            const initials =
              displayName
                .split(/\s+/)
                .map(s => s[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || '?'
            return (
              <div
                key={follower.id}
                className="flex items-center gap-4 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/40"
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={getMediaUrl(follower.avatarUrl)} alt={displayName} />
                  <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                </div>
                <div className="shrink-0 font-mono text-[12px] text-muted-foreground">
                  {formatDate(follower.followedAt)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          summary={t('workspace.followers.pageInfo', { page, total: totalPages })}
          previousLabel={t('actions.previous')}
          nextLabel={t('actions.next')}
        />
      )}
    </div>
  )
}

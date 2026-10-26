import { useEffect, useMemo, useRef, useState } from 'react'

import { CheckCircle2, Loader2, Mail, Search, UserCog, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import type {
  ArtifactRecipient,
  ArtifactRecipientSourceType,
  RecipientRole,
} from '@api/services'
import {
  useArtifactRecipientsInfiniteQuery,
  useRecipientRolesQuery,
} from '@features/events/api'
import { useT } from '@eventflow/i18n/react'
import { cn } from '@shared/lib/cn'
import { useDebounce } from '@shared/lib/use-debounce'
import {
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@shared/ui'

type RecipientSelectorProps = {
  eventId: string
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
  /** Optional initial role filter (id). */
  initialRoleId?: string | null
  className?: string
  pageSize?: number
  /** Max number of recipients selectable at once (e.g. backend batch limit). */
  maxSelection?: number
}

const SOURCE_LABEL_KEY: Record<ArtifactRecipientSourceType, string> = {
  USER: 'events.certificates.recipientsSheet.source.user',
  REGISTRATION: 'events.certificates.recipientsSheet.source.registration',
  SPEAKER: 'events.certificates.recipientsSheet.source.speaker',
  MANUAL: 'events.certificates.recipientsSheet.source.manual',
  EMAIL: 'events.certificates.recipientsSheet.source.email',
}

function sourcesSummary(recipient: ArtifactRecipient): ArtifactRecipientSourceType[] {
  const set = new Set(recipient.sources.sourceTypes)
  if (recipient.sources.registrationId) set.add('REGISTRATION')
  if (recipient.sources.speakerId) set.add('SPEAKER')
  if (recipient.sources.userId) set.add('USER')
  if (set.size === 0) set.add('MANUAL')
  return Array.from(set)
}

function activeRoles(recipient: ArtifactRecipient) {
  return recipient.roles.filter(r => r.assignmentStatus === 'ACTIVE')
}

function RoleChip({ name, code }: { name: string; code: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
      title={code}
    >
      {name}
    </span>
  )
}

function SourceChip({ source }: { source: ArtifactRecipientSourceType }) {
  const t = useT()
  const Icon =
    source === 'EMAIL'
      ? Mail
      : source === 'MANUAL'
        ? UserPlus
        : source === 'SPEAKER'
          ? UserCog
          : Users
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/60">
      <Icon className="h-2.5 w-2.5" />
      {t(SOURCE_LABEL_KEY[source])}
    </span>
  )
}

const NO_ROLE_FILTER = '__all__'

export function RecipientSelector({
  eventId,
  selectedIds,
  onChange,
  initialRoleId,
  className,
  pageSize = 25,
  maxSelection,
}: RecipientSelectorProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [roleId, setRoleId] = useState<string>(initialRoleId ?? NO_ROLE_FILTER)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const t = useT()
  const tx = (key: string, params?: Record<string, string | number>) =>
    t(`events.certificates.recipientsSheet.${key}`, params)

  const rolesQuery = useRecipientRolesQuery(eventId)
  const recipientsQuery = useArtifactRecipientsInfiniteQuery(eventId, {
    limit: pageSize,
    search: debouncedSearch || undefined,
    roleId: roleId === NO_ROLE_FILTER ? undefined : roleId,
    status: 'ACTIVE',
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = recipientsQuery

  const recipients = useMemo(
    () => data?.pages.flatMap(p => p.data) ?? [],
    [data?.pages]
  )
  const total = data?.pages[0]?.total ?? 0

  // Scroll-load: fetch the next page when the sentinel enters the viewport.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '120px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, recipients.length])

  const limitReached = (size: number): boolean => {
    if (maxSelection && size > maxSelection) {
      toast.error(tx('selectionLimit', { count: maxSelection }))
      return true
    }
    return false
  }

  const visibleIds = useMemo(() => recipients.map(r => r.id), [recipients])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (limitReached(next.size + 1)) return
      next.add(id)
    }
    onChange(next)
  }

  const toggleAllVisible = () => {
    const next = new Set(selectedIds)
    if (allVisibleSelected) {
      visibleIds.forEach(id => next.delete(id))
    } else {
      const toAdd = visibleIds.filter(id => !next.has(id))
      if (limitReached(next.size + toAdd.length)) return
      toAdd.forEach(id => next.add(id))
    }
    onChange(next)
  }

  const sortedRoles = useMemo(() => {
    const list: RecipientRole[] = rolesQuery.data ?? []
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [rolesQuery.data])

  return (
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx('searchByNameOrEmail')}
            className="pl-9"
          />
        </div>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder={tx('allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ROLE_FILTER}>{tx('allRoles')}</SelectItem>
            {sortedRoles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                <span className="flex items-center gap-1.5">
                  {role.displayName}
                  {!role.isActive && (
                    <span className="text-[10px] text-muted-foreground">
                      {t('events.badges.upload.roleOff')}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {debouncedSearch ? tx('nothingFound') : tx('emptyList')}
          </div>
        ) : (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={toggleAllVisible}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
            >
              <Checkbox checked={allVisibleSelected} className="pointer-events-none" />
              <span>
                {allVisibleSelected
                  ? tx('unselectLoaded')
                  : tx('selectLoaded', { count: visibleIds.length })}
              </span>
              <span className="ml-auto text-muted-foreground">
                {tx('selectedLabel')}{' '}
                <span className="font-semibold text-foreground">{selectedIds.size}</span>
                {maxSelection ? ` / ${maxSelection}` : ''}
              </span>
            </button>
            {/* Concrete max-height: a position:fixed dialog with only max-height
                doesn't give descendants a definite height, so flex-1/h-full
                scroll chains don't bound. A fixed cap makes the list its own
                reliable scroller. */}
            <ul className="mt-2 max-h-[55vh] space-y-1 overflow-y-auto pr-1">
              {recipients.map(recipient => {
                const isSelected = selectedIds.has(recipient.id)
                const recipientRoles = activeRoles(recipient)
                const sources = sourcesSummary(recipient)
                return (
                  <li key={recipient.id}>
                    <button
                      type="button"
                      onClick={() => toggleOne(recipient.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition',
                        isSelected
                          ? 'border-primary/40 bg-primary/[0.04]'
                          : 'border-transparent hover:border-border hover:bg-muted/40'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {recipient.displayName}
                          </p>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </div>
                        {recipient.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {recipient.email}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {recipientRoles.map(role => (
                            <RoleChip
                              key={role.id}
                              name={role.displayName}
                              code={role.code}
                            />
                          ))}
                          {recipientRoles.length === 0 && (
                            <span className="text-[10px] text-muted-foreground/80">
                              {tx('noRoles')}
                            </span>
                          )}
                          <span className="mx-1 text-muted-foreground/40">·</span>
                          {sources.map(source => (
                            <SourceChip key={source} source={source} />
                          ))}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
              {/* Scroll-load sentinel + "loading more" indicator */}
              <li ref={sentinelRef} aria-hidden className="h-px" />
              {isFetchingNextPage && (
                <li className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('common.loading')}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {recipients.length > 0 && (
        <div className="border-t border-border/60 pt-2 text-xs text-muted-foreground">
          {tx('shownOfTotal', { shown: recipients.length, total })}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-destructive dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
          {tx('loadError')}
        </div>
      )}
    </div>
  )
}

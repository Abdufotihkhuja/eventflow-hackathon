/**
 * Страница заявок на связь организации
 * API: /api/v1/organizations/contacts
 */

import { useState, useMemo } from 'react'
import { useT } from '@eventflow/i18n/react'
import { Search, MessageSquare, Loader2, Filter } from 'lucide-react'
import { toast } from 'sonner'

import type { ContactRequest, ContactRequestStatus } from '@api/services'
import {
  useContactsQuery,
  useContactsStatsQuery,
  useUpdateContactStatusMutation,
} from '@features/organization-contacts'
import { cn } from '@shared/lib/cn'
import {
  Card,
  Input,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@shared/ui'
import { formatDate, formatUserName, getUserInitials } from '@shared/lib'

const CONTACT_STATUS_LABELS: Record<ContactRequestStatus, string> = {
  NEW: 'contacts.status.new',
  IN_PROGRESS: 'contacts.status.inProgress',
  CLOSED: 'contacts.status.closed',
}

function ContactsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="grid gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <div className="size-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-64 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContactRequestStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data: statsData } = useContactsStatsQuery()
  const { data: contactsResponse, isLoading } = useContactsQuery({
    page,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })
  const updateStatus = useUpdateContactStatusMutation()

  const contacts = useMemo(() => {
    if (!contactsResponse) return []
    return Array.isArray(contactsResponse) ? contactsResponse : contactsResponse.data ?? []
  }, [contactsResponse])

  const total = useMemo(() => {
    if (!contactsResponse || Array.isArray(contactsResponse)) return contacts.length
    return contactsResponse.total ?? 0
  }, [contactsResponse, contacts.length])

  const totalPages =
    ((contactsResponse && !Array.isArray(contactsResponse) ? contactsResponse.totalPages : undefined) ??
      Math.ceil(total / limit)) || 1

  const handleStatusChange = async (contact: ContactRequest, newStatus: ContactRequestStatus) => {
    try {
      await updateStatus.mutateAsync({ id: contact.id, data: { status: newStatus } })
      toast.success(t('toasts.contacts.statusUpdated'))
    } catch {
      toast.error(t('toasts.contacts.statusUpdateError'))
    }
  }

  if (isLoading && !contactsResponse) {
    return <ContactsPageSkeleton />
  }

  const statsTotal = typeof statsData === 'object' && statsData !== null && 'total' in statsData
    ? (statsData as { total: number }).total
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('contacts.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('contacts.description')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageSquare className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('contacts.stats.totalRequests')}</p>
              <p className="text-2xl font-semibold tabular-nums">{statsTotal}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('contacts.filters.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ContactRequestStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 size-4 text-muted-foreground" />
              <SelectValue placeholder={t('contacts.filters.statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('contacts.filters.allStatuses')}</SelectItem>
              {(Object.entries(CONTACT_STATUS_LABELS) as [ContactRequestStatus, string][]).map(([value, labelKey]) => (
                <SelectItem key={value} value={value}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <MessageSquare className="size-12 opacity-50" />
            <p className="mt-2 font-medium">{t('contacts.empty.title')}</p>
            <p className="mt-1 text-sm">{t('contacts.empty.description')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((contact: ContactRequest) => (
              <li key={contact.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={contact.user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(contact.user.firstName, contact.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {formatUserName(contact.user.firstName, contact.user.lastName) || t('contacts.fields.unnamed')}
                      </p>
                      <Badge variant={contact.status === 'NEW' ? 'default' : contact.status === 'CLOSED' ? 'secondary' : 'outline'}>
                        {t(CONTACT_STATUS_LABELS[contact.status])}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    {contact.message && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{contact.message}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{t('contacts.fields.created', { date: formatDate(contact.createdAt) })}</span>
                      <span>{t('contacts.fields.updated', { date: formatDate(contact.updatedAt) })}</span>
                    </div>
                  </div>
                </div>
                {contact.status !== 'CLOSED' && (
                  <div className="flex shrink-0 gap-2">
                    {contact.status === 'NEW' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(contact, 'IN_PROGRESS')}
                        disabled={updateStatus.isPending}
                      >
                        {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : t('contacts.actions.moveToWork')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={contact.status === 'CLOSED' ? 'secondary' : 'default'}
                      onClick={() => handleStatusChange(contact, 'CLOSED')}
                      disabled={updateStatus.isPending}
                    >
                      {t('contacts.actions.close')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {(totalPages > 1 || total > 0) && (
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t('contacts.fields.total', { total })}
              {totalPages > 1 && ` · ${t('contacts.fields.page', { page, totalPages })}`}
            </p>
            {totalPages > 1 && (
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
                  {t('actions.back')}
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
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

/**
 * Страница заявок на связь организации
 * API: /api/v1/organizations/contacts
 */

import { useState, useMemo } from 'react'
import { ChevronRight, Copy, MessageSquare, Phone, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import type { ContactRequest, ContactRequestStatus } from '@api/services'
import {
  useContactsQuery,
  useContactsStatsQuery,
  useUpdateContactStatusMutation,
} from '@features/organization-contacts'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  PageTabs,
  type PageTabItem,
  PaginationBar,
  StatTile,
} from '@shared/ui'
import { formatDate, formatUserName, getUserInitials } from '@shared/lib'

import { ContactDetailSheet } from './contact-detail-sheet'

const CONTACT_STATUS_LABEL_KEYS: Record<ContactRequestStatus, string> = {
  NEW: 'contacts.status.new',
  IN_PROGRESS: 'contacts.status.inProgress',
  CLOSED: 'contacts.status.closed',
}

const STATUS_BADGE: Record<ContactRequestStatus, 'default' | 'secondary' | 'outline'> = {
  NEW: 'default',
  IN_PROGRESS: 'outline',
  CLOSED: 'secondary',
}

type StatusTab = ContactRequestStatus | 'all'

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
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all')
  const [page, setPage] = useState(1)
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null)
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

  const byStatus = statsData?.byStatus
  const statusTabs: PageTabItem<StatusTab>[] = [
    { id: 'all', label: t('contacts.filters.allStatuses'), count: statsData?.total },
    { id: 'NEW', label: t('contacts.status.new'), count: byStatus?.NEW },
    { id: 'IN_PROGRESS', label: t('contacts.status.inProgress'), count: byStatus?.IN_PROGRESS },
    { id: 'CLOSED', label: t('contacts.status.closed'), count: byStatus?.CLOSED },
  ]

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      toast.success(t('toasts.contacts.phoneCopied'))
    } catch {
      toast.error(t('toasts.contacts.phoneCopyError'))
    }
  }

  const handleStatusChange = async (contact: ContactRequest, newStatus: ContactRequestStatus) => {
    try {
      await updateStatus.mutateAsync({ id: contact.id, data: { status: newStatus } })
      toast.success(t('toasts.contacts.statusUpdated'))
      setSelectedContact(null)
    } catch {
      toast.error(t('toasts.contacts.statusUpdateError'))
    }
  }

  if (isLoading && !contactsResponse) {
    return <ContactsPageSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('contacts.title')} description={t('contacts.description')} />

      <div className="grid gap-4 sm:max-w-xs">
        <StatTile
          label={t('contacts.stats.totalRequests')}
          value={statsData?.total ?? 0}
          icon={MessageSquare}
        />
      </div>

      <PageTabs
        items={statusTabs}
        active={statusFilter}
        onChange={next => {
          setStatusFilter(next)
          setPage(1)
        }}
      />

      <div className="relative sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder={t('contacts.filters.searchPlaceholder')}
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="h-10 pl-9"
          aria-label={t('contacts.filters.searchPlaceholder')}
        />
      </div>

      {contacts.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title={t('contacts.empty.title')}
            description={t('contacts.empty.description')}
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {contacts.map((contact: ContactRequest) => (
            <div
              key={contact.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedContact(contact)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedContact(contact)
                }
              }}
              className="flex cursor-pointer items-center gap-4 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={contact.user.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {getUserInitials(contact.user.firstName, contact.user.lastName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">
                    {formatUserName(contact.user.firstName, contact.user.lastName) ||
                      t('contacts.fields.unnamed')}
                  </p>
                  <Badge variant={STATUS_BADGE[contact.status]}>
                    {t(CONTACT_STATUS_LABEL_KEYS[contact.status])}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  <span className="font-mono">{contact.phone}</span>
                  {contact.message ? ` · ${contact.message}` : ''}
                </p>
                <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                  {t('contacts.fields.created', { date: formatDate(contact.createdAt) })}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={e => e.stopPropagation()}
                >
                  <a href={`tel:${contact.phone}`} aria-label={t('contacts.actions.call')}>
                    <Phone className="size-4" />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={t('contacts.actions.copyPhone')}
                  onClick={e => {
                    e.stopPropagation()
                    handleCopyPhone(contact.phone)
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      )}

      {(totalPages > 1 || total > 0) && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          summary={
            totalPages > 1
              ? `${t('contacts.fields.total', { total })} · ${t('contacts.fields.page', { page, totalPages })}`
              : t('contacts.fields.total', { total })
          }
          previousLabel={t('actions.back')}
          nextLabel={t('actions.next')}
        />
      )}

      <ContactDetailSheet
        contact={selectedContact}
        onOpenChange={open => !open && setSelectedContact(null)}
        onStatusChange={handleStatusChange}
        isUpdating={updateStatus.isPending}
      />
    </div>
  )
}

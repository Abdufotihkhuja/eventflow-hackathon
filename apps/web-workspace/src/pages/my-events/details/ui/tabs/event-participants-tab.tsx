import { useMemo, useState } from 'react'

import {
  Ban,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreVertical,
  Search,
  Ticket,
  Undo2,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { Registration } from '@api/services/registration.types'
import {
  REGISTRATION_STATUS_LABEL_KEYS,
  RegistrationStatus,
  getRegistrationStatusLabel,
} from '@entities/registration'
import {
  useEventRegistrationsQuery,
  useApproveRegistration,
  useRejectRegistration,
  useCancelRegistration,
  useRevokeApproval,
  useBulkApproveRegistrations,
  useBulkRejectRegistrations,
  useDownloadTicket,
  useDownloadAllTickets,
} from '@features/events/api'
import { eventRegistrationsService } from '@api/services'
import { getRegistrationPhone } from '@features/events/lib/registration-phone'
import {
  exportRegistrationsToCsv,
  exportRegistrationsToExcel,
  exportRegistrationsBundleZip,
} from '@features/events/lib/registrations-export'
import {
  BulkTicketDownloadMenu,
  RegistrationDetailSheet,
  type RegistrationDetailSheetEvent,
} from '@features/events/ui'
import { LimitPrompt, mapBillingError } from '@features/billing'
import { cn, formatUserName, getUserInitials, useDebounce } from '@shared/lib'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Input,
  PageTabs,
  type PageTabItem,
  Skeleton,
  StatusPill,
  statusPillTone,
  Textarea,
} from '@shared/ui'
import { toast } from 'sonner'

import { EventTabHeader } from '../event-tab-header'

type StatusTab = RegistrationStatus | 'all'

type EventParticipantsTabProps = {
  eventId: string
  eventName?: string
  /** Данные события для отображения результатов теста и передачи в панель деталей */
  event?: RegistrationDetailSheetEvent | null
}

const paymentLabelKey: Record<NonNullable<Registration['paymentStatus']>, string> = {
  paid: 'events.participants.paymentPaid',
  pending: 'events.participants.paymentPending',
  refunded: 'events.participants.paymentRefunded',
  failed: 'events.participants.paymentFailed',
}

export function EventParticipantsTab({ eventId, eventName, event: eventInfo }: EventParticipantsTabProps) {
  const { locale, t } = useI18n()
  const [searchInput, setSearchInput] = useState('')
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<Registration | null>(null)
  const [detailRegistrationId, setDetailRegistrationId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(searchInput, 500)

  const { data, isLoading, isError, refetch } = useEventRegistrationsQuery(eventId, {
    page,
    limit: 20,
    status: statusTab !== 'all' ? (statusTab as RegistrationStatus) : undefined,
    search: debouncedSearch || undefined,
  })

  // Client-side export. No backend /registrations/export endpoint exists —
  // fetch all rows via the regular list query with a high limit and build
  // the file in the browser via exceljs (already pre-bundled for batch import).
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | 'zip' | null>(null)
  const downloadTicketMutation = useDownloadTicket(eventId)
  const downloadAllTicketsMutation = useDownloadAllTickets(eventId)
  const approveMutation = useApproveRegistration(eventId)
  const rejectMutation = useRejectRegistration(eventId)
  const cancelMutation = useCancelRegistration(eventId)
  const revokeMutation = useRevokeApproval(eventId)
  const bulkApproveMutation = useBulkApproveRegistrations(eventId)
  const bulkRejectMutation = useBulkRejectRegistrations(eventId)

  const registrations = useMemo(() => (data?.data ?? []) as Registration[], [data])
  const stats = data?.stats
  const hasPayment = useMemo(
    () => registrations.some(r => r.paymentAmount != null || r.paymentStatus != null),
    [registrations]
  )
  const isTest = eventInfo?.registrationMode === 'TEST'

  const approvedCount = useMemo(
    () => registrations.filter(r => r.status === RegistrationStatus.APPROVED).length,
    [registrations]
  )

  // Status tabs — counts only when the backend returns real stats.
  const statusTabs: PageTabItem<StatusTab>[] = [
    { id: 'all', label: t('events.participants.allStatuses'), count: stats?.total },
    { id: RegistrationStatus.PENDING, label: t(REGISTRATION_STATUS_LABEL_KEYS.PENDING), count: stats?.pending },
    {
      id: RegistrationStatus.APPROVED,
      label: t(REGISTRATION_STATUS_LABEL_KEYS.APPROVED),
      count: stats ? (stats.approved ?? 0) + (stats.confirmed ?? 0) : undefined,
    },
    { id: RegistrationStatus.REJECTED, label: t(REGISTRATION_STATUS_LABEL_KEYS.REJECTED), count: stats?.rejected },
    { id: RegistrationStatus.CANCELLED, label: t(REGISTRATION_STATUS_LABEL_KEYS.CANCELLED), count: stats?.cancelled },
    { id: RegistrationStatus.WAITLIST, label: t(REGISTRATION_STATUS_LABEL_KEYS.WAITLIST), count: stats?.waitlist },
  ]

  const allOnPageSelected = registrations.length > 0 && registrations.every(r => selectedIds.has(r.id))
  const someOnPageSelected = registrations.some(r => selectedIds.has(r.id))

  const toggleSelected = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSelectAll = () =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allOnPageSelected) registrations.forEach(r => next.delete(r.id))
      else registrations.forEach(r => next.add(r.id))
      return next
    })

  const handleExport = async (format: 'csv' | 'xlsx' | 'zip') => {
    setExportingFormat(format)
    try {
      // Pull every row matching current filters (status + search). Backend
      // caps `limit` server-side; 10k is plenty for the cabinet use case.
      const page = await eventRegistrationsService.getRegistrations(eventId, {
        page: 1,
        limit: 10_000,
        status: statusTab !== 'all' ? (statusTab as RegistrationStatus) : undefined,
        search: debouncedSearch || undefined,
      })
      const rows = (page.data ?? []) as Registration[]
      if (rows.length === 0) {
        toast.message(t('events.participants.exportEmpty'))
        return
      }
      const labels = {
        sheetName: t('events.participants.exportSheetName'),
        firstName: t('events.participants.exportColFirstName'),
        lastName: t('events.participants.exportColLastName'),
        email: t('events.participants.exportColEmail'),
        phone: t('events.participants.exportColPhone'),
        status: t('events.participants.exportColStatus'),
        role: t('events.participants.exportColRole'),
        registeredAt: t('events.participants.exportColRegisteredAt'),
        testScore: t('events.participants.exportColTestScore'),
        questionPrefix: t('events.participants.exportColQuestionPrefix'),
        statusPending: t(REGISTRATION_STATUS_LABEL_KEYS.PENDING),
        statusApproved: t(REGISTRATION_STATUS_LABEL_KEYS.APPROVED),
        statusConfirmed: t(REGISTRATION_STATUS_LABEL_KEYS.APPROVED),
        statusRejected: t(REGISTRATION_STATUS_LABEL_KEYS.REJECTED),
        statusCancelled: t(REGISTRATION_STATUS_LABEL_KEYS.CANCELLED),
        statusWaitlist: t(REGISTRATION_STATUS_LABEL_KEYS.WAITLIST),
      }
      const stem = `${eventName ?? 'event'}-participants`
      const formatDateCell = (iso: string) => formatDate(new Date(iso), locale)
      const args = {
        registrations: rows,
        fileStem: stem,
        labels,
        formatDateCell,
        includeTestScore: isTest,
      }
      if (format === 'xlsx') {
        await exportRegistrationsToExcel(args)
        toast.success(t('events.participants.exportDone', { count: rows.length }))
      } else if (format === 'csv') {
        exportRegistrationsToCsv(args)
        toast.success(t('events.participants.exportDone', { count: rows.length }))
      } else {
        // ZIP bundle: spreadsheet + every uploaded answer file. Files are
        // fetched one-by-one, so surface live progress in a single toast.
        const toastId = 'export-zip'
        toast.loading(t('events.participants.exportZipStart'), { id: toastId })
        const result = await exportRegistrationsBundleZip({
          ...args,
          fetchFile: (registrationId, fileId) =>
            eventRegistrationsService.downloadAnswerFile(eventId, registrationId, fileId),
          onProgress: (done, total) => {
            if (total > 0) {
              toast.loading(t('events.participants.exportZipProgress', { done, total }), {
                id: toastId,
              })
            }
          },
        })
        if (result.filesFailed > 0) {
          toast.warning(
            t('events.participants.exportZipPartial', {
              ok: result.filesIncluded,
              failed: result.filesFailed,
            }),
            { id: toastId }
          )
        } else {
          toast.success(
            t('events.participants.exportZipDone', {
              count: rows.length,
              files: result.filesIncluded,
            }),
            { id: toastId }
          )
        }
      }
    } catch (err) {
      console.error('Failed to export registrations', err)
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message ?? '')
          : t('events.participants.exportError')
      toast.error(message || t('events.participants.exportError'))
    } finally {
      setExportingFormat(null)
    }
  }

  const handleDownloadTicket = (registration: Registration, design: 'branded' | 'simple') =>
    downloadTicketMutation.mutate({
      registrationId: registration.id,
      design,
      participantName:
        formatUserName(registration.user.firstName, registration.user.lastName).replace(/\s+/g, '_') ||
        'participant',
    })

  const handleDownloadAllTickets = (design: 'branded' | 'simple') =>
    downloadAllTicketsMutation.mutate({
      design,
      status: statusTab !== 'all' ? statusTab : undefined,
    })

  const handleApprove = (registrationId: string) =>
    approveMutation.mutate(registrationId, {
      onSuccess: () => toast.success(t('toasts.registrations.approveSuccess')),
      onError: error => {
        // C-11: 409 BILLING_CAP_EXCEEDED (участники события) рендерится
        // честной панелью из approveMutation.error — обычный тост не нужен.
        if (!mapBillingError(error)) toast.error(t('toasts.registrations.approveError'))
      },
    })

  const handleRejectConfirm = () => {
    if (!rejectTarget) return
    rejectMutation.mutate(
      { registrationId: rejectTarget.id, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast.success(t('toasts.registrations.rejectSuccess'))
          setRejectTarget(null)
          setRejectReason('')
        },
        onError: () => toast.error(t('toasts.registrations.rejectError')),
      }
    )
  }

  const handleCancelConfirm = () => {
    if (!cancelTarget) return
    cancelMutation.mutate(
      { registrationId: cancelTarget.id, reason: cancelReason || undefined },
      {
        onSuccess: () => {
          toast.success(t('toasts.registrations.cancelSuccess'))
          setCancelTarget(null)
          setCancelReason('')
        },
        onError: () => toast.error(t('toasts.registrations.cancelError')),
      }
    )
  }

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return
    revokeMutation.mutate(
      { registrationId: revokeTarget.id },
      {
        onSuccess: () => {
          toast.success(t('toasts.registrations.revokeSuccess'))
          setRevokeTarget(null)
        },
        onError: () => toast.error(t('toasts.registrations.revokeError')),
      }
    )
  }

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return
    bulkApproveMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        toast.success(t('toasts.registrations.bulkApproveSuccess', { count: selectedIds.size }))
        setSelectedIds(new Set())
      },
      onError: () => toast.error(t('toasts.registrations.bulkApproveError')),
    })
  }

  const handleBulkRejectConfirm = () => {
    if (selectedIds.size === 0) return
    bulkRejectMutation.mutate(
      { registrationIds: Array.from(selectedIds), reason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast.success(t('toasts.registrations.bulkRejectSuccess', { count: selectedIds.size }))
          setSelectedIds(new Set())
          setRejectReason('')
          setBulkRejectOpen(false)
        },
        onError: () => toast.error(t('toasts.registrations.bulkRejectError')),
      }
    )
  }

  const onSearchChange = (value: string) => {
    setSearchInput(value)
    setPage(1)
  }
  const onStatusTabChange = (next: StatusTab) => {
    setStatusTab(next)
    setPage(1)
  }

  // checkbox · attendee · phone · registered · [payment] · status · actions
  const gridCols = [
    '24px',
    'minmax(0,1fr)',
    '150px',
    '130px',
    ...(hasPayment ? ['120px'] : []),
    '120px',
    '40px',
  ].join(' ')

  // C-11: капы регистраций (MAX_PARTICIPANTS_PER_EVENT) при одобрении.
  const approveBillingError = approveMutation.isError
    ? mapBillingError(approveMutation.error)
    : null

  return (
    <div className="space-y-6">
      {approveBillingError && (
        <LimitPrompt error={approveBillingError} onClose={() => approveMutation.reset()} />
      )}

      {/* Header zone — title, description and status tabs read as one unit */}
      <div className="space-y-5">
      <EventTabHeader
        kicker={eventName}
        title={t('events.participants.title')}
        description={t('events.participants.description')}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  title={t('events.participants.exportButtonTitle')}
                  disabled={(stats?.total ?? registrations.length) === 0 || exportingFormat !== null}
                >
                  {exportingFormat !== null ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="size-4" />
                  )}
                  <span className="hidden sm:inline">{t('actions.export')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Download className="size-4 text-muted-foreground" />
                  {t('events.participants.exportMenuTitle')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  disabled={exportingFormat !== null}
                  className="gap-2"
                >
                  {exportingFormat === 'csv' ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <FileText className="size-3.5 text-muted-foreground" />
                  )}
                  {t('events.participants.exportCsv')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('xlsx')}
                  disabled={exportingFormat !== null}
                  className="gap-2"
                >
                  {exportingFormat === 'xlsx' ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <FileSpreadsheet className="size-3.5 text-muted-foreground" />
                  )}
                  {t('events.participants.exportExcel')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleExport('zip')}
                  disabled={exportingFormat !== null}
                  className="gap-2"
                >
                  {exportingFormat === 'zip' ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <FileArchive className="size-3.5 text-muted-foreground" />
                  )}
                  <span className="flex flex-col">
                    <span>{t('events.participants.exportZip')}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t('events.participants.exportZipHint')}
                    </span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <BulkTicketDownloadMenu
              onDownloadAll={handleDownloadAllTickets}
              isLoading={downloadAllTicketsMutation.isPending}
              ticketsCount={approvedCount}
              disabled={approvedCount === 0}
            />
          </>
        }
      />

      {/* Status tabs */}
      <PageTabs items={statusTabs} active={statusTab} onChange={onStatusTabChange} />
      </div>

      {/* Toolbar — search, clearly separated from the status filter above */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={t('events.participants.searchPlaceholder')}
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
            className="h-10 pl-9"
            aria-label={t('events.participants.searchPlaceholder')}
          />
        </div>
        {stats?.total != null && (
          <p className="font-mono text-[12px] text-muted-foreground sm:ml-auto">
            {t('events.participants.registeredSummary', { count: stats.total })}
          </p>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-foreground px-3 py-2 text-background">
          <span className="px-2 text-sm font-medium">
            {t('events.participants.selectedCount', { count: selectedIds.size })}
          </span>
          <span aria-hidden className="mx-1 h-4 w-px bg-background/20" />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-background hover:bg-background/15 hover:text-background"
            disabled={bulkApproveMutation.isPending}
            onClick={handleBulkApprove}
          >
            <UserCheck className="size-4" />
            {t('events.participants.approveSelected')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-background hover:bg-background/15 hover:text-background"
            disabled={bulkRejectMutation.isPending}
            onClick={() => setBulkRejectOpen(true)}
          >
            <UserX className="size-4" />
            {t('events.participants.rejectSelected')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-8 text-background/80 hover:bg-background/15 hover:text-background"
            onClick={() => setSelectedIds(new Set())}
          >
            {t('events.participants.clearSelection')}
          </Button>
        </div>
      )}

      {/* Table */}
      {isError ? (
        <ErrorState
          title={t('events.participants.loadErrorTitle')}
          description={t('events.participants.loadErrorDescription')}
          onRetry={() => refetch()}
          retryLabel={t('events.participants.refreshPage')}
        />
      ) : isLoading ? (
        <div className="space-y-2 rounded-lg border border-border bg-card p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={Users}
            title={t('events.participants.emptyTitle')}
            description={
              debouncedSearch || statusTab !== 'all'
                ? t('events.participants.emptyFilteredDescription')
                : t('events.participants.emptyDescription')
            }
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* Header row */}
          <div
            className="hidden items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid"
            style={{ gridTemplateColumns: gridCols }}
          >
            <Checkbox
              checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
              onCheckedChange={toggleSelectAll}
              aria-label={t('events.participants.selectAllAria')}
              className="size-4"
            />
            <span>{t('events.participants.colAttendee')}</span>
            <span>{t('events.participants.colPhone')}</span>
            <span>{t('events.participants.colRegistered')}</span>
            {hasPayment && <span>{t('events.participants.colPayment')}</span>}
            <span>{t('events.participants.colStatus')}</span>
            <span aria-hidden />
          </div>

          {registrations.map(registration => {
            const fullName =
              formatUserName(registration.user.firstName, registration.user.lastName) ||
              registration.user.email
            const phone = getRegistrationPhone(registration)
            const selected = selectedIds.has(registration.id)
            const payAmount =
              registration.paymentAmount != null
                ? `${registration.paymentAmount.toLocaleString()} ${registration.paymentCurrency ?? ''}`.trim()
                : null
            return (
              <div
                key={registration.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailRegistrationId(registration.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') setDetailRegistrationId(registration.id)
                }}
                className={cn(
                  'grid cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  selected && 'bg-muted/30'
                )}
                style={{ gridTemplateColumns: gridCols }}
              >
                <span onClick={e => e.stopPropagation()} className="flex">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleSelected(registration.id)}
                    aria-label={t('events.participants.selectParticipantAria', { name: fullName })}
                    className="size-4"
                  />
                </span>

                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarImage src={getMediaUrl(registration.user.avatarUrl)} alt="" />
                    <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                      {getUserInitials(registration.user.firstName, registration.user.lastName) ||
                        registration.user.email?.charAt(0).toUpperCase() ||
                        '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
                      <span className="sm:hidden">
                        <StatusPill tone={statusPillTone(registration.status)} size="sm">
                          {getRegistrationStatusLabel(t)(registration.status)}
                        </StatusPill>
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{registration.user.email}</p>
                    {phone && (
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground sm:hidden" title={phone}>
                        {phone}
                      </p>
                    )}
                    {isTest && registration.testScore != null && (
                      <span className="mt-0.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {t('events.participants.testScoreLabel')} {registration.testScore}
                        {eventInfo?.maxTestScore != null ? ` / ${eventInfo.maxTestScore}` : ''}
                        {registration.testPassed ? ' ✓' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <span className="hidden truncate font-mono text-[12px] text-muted-foreground sm:block" title={phone}>
                  {phone ?? '–'}
                </span>

                <span className="hidden font-mono text-[12px] text-muted-foreground sm:block">
                  {formatDate(registration.createdAt, locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>

                {hasPayment && (
                  <span className="hidden sm:block">
                    {payAmount ? (
                      <span className="font-mono text-[12px] text-foreground">{payAmount}</span>
                    ) : registration.paymentStatus ? (
                      <StatusPill tone={statusPillTone(registration.paymentStatus)} size="sm">
                        {t(paymentLabelKey[registration.paymentStatus])}
                      </StatusPill>
                    ) : (
                      <span className="text-muted-foreground/50">–</span>
                    )}
                  </span>
                )}

                <span className="hidden sm:block">
                  <StatusPill tone={statusPillTone(registration.status)} size="sm">
                    {getRegistrationStatusLabel(t)(registration.status)}
                  </StatusPill>
                </span>

                <span onClick={e => e.stopPropagation()} className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={t('events.participants.detailsButtonTitle')}>
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setDetailRegistrationId(registration.id)}>
                        <FileText className="mr-2 size-4" />
                        {t('events.participants.detailsButton')}
                      </DropdownMenuItem>
                      {registration.status === RegistrationStatus.PENDING && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleApprove(registration.id)} disabled={approveMutation.isPending}>
                            <UserCheck className="mr-2 size-4" />
                            {t('events.participants.approveAction')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRejectTarget(registration)
                              setRejectReason('')
                            }}
                            className="text-destructive"
                          >
                            <UserX className="mr-2 size-4" />
                            {t('actions.reject')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCancelTarget(registration)
                              setCancelReason('')
                            }}
                            className="text-destructive"
                          >
                            <Ban className="mr-2 size-4" />
                            {t('events.participants.cancelAction')}
                          </DropdownMenuItem>
                        </>
                      )}
                      {registration.status === RegistrationStatus.APPROVED && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDownloadTicket(registration, 'branded')} disabled={downloadTicketMutation.isPending}>
                            <Ticket className="mr-2 size-4" />
                            {t('events.tickets.brandedTitle')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadTicket(registration, 'simple')} disabled={downloadTicketMutation.isPending}>
                            <Ticket className="mr-2 size-4" />
                            {t('events.tickets.simpleTitle')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setRevokeTarget(registration)}>
                            <Undo2 className="mr-2 size-4" />
                            {t('events.participants.revokeAction')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCancelTarget(registration)
                              setCancelReason('')
                            }}
                            className="text-destructive"
                          >
                            <Ban className="mr-2 size-4" />
                            {t('events.participants.cancelAction')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            {t('actions.back')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('common.page')} {page} {t('common.of')} {data.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>
            {t('actions.next')}
          </Button>
        </div>
      )}

      {/* Reject single */}
      <AlertDialog open={!!rejectTarget} onOpenChange={open => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.participants.rejectDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget &&
                t('events.participants.rejectDialogDescription', {
                  name:
                    formatUserName(rejectTarget.user.firstName, rejectTarget.user.lastName) ||
                    rejectTarget.user.email,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {rejectTarget && (
            <Textarea
              placeholder={t('events.participants.rejectReasonPlaceholder')}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="mt-2 min-h-[80px]"
              maxLength={500}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectTarget(null)}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending ? t('events.participants.rejecting') : t('actions.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk reject */}
      <AlertDialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.participants.bulkRejectDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.participants.bulkRejectDialogDescription', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder={t('events.participants.rejectReasonPlaceholder')}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="mt-2 min-h-[80px]"
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkRejectOpen(false)}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRejectConfirm}
              disabled={bulkRejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkRejectMutation.isPending ? t('events.participants.rejecting') : t('actions.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel participation (organizer) — terminal, frees the seat */}
      <AlertDialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.participants.cancelDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget &&
                t('events.participants.cancelDialogDescription', {
                  name:
                    formatUserName(cancelTarget.user.firstName, cancelTarget.user.lastName) ||
                    cancelTarget.user.email,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelTarget && (
            <Textarea
              placeholder={t('events.participants.cancelReasonPlaceholder')}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="mt-2 min-h-[80px]"
              maxLength={500}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelTarget(null)}>{t('actions.back')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? t('events.participants.cancelling') : t('events.participants.cancelAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke approval (organizer) — reversible, back to pending review */}
      <AlertDialog open={!!revokeTarget} onOpenChange={open => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.participants.revokeDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget &&
                t('events.participants.revokeDialogDescription', {
                  name:
                    formatUserName(revokeTarget.user.firstName, revokeTarget.user.lastName) ||
                    revokeTarget.user.email,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeTarget(null)}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeConfirm} disabled={revokeMutation.isPending}>
              {revokeMutation.isPending ? t('events.participants.revoking') : t('events.participants.revokeAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RegistrationDetailSheet
        eventId={eventId}
        registrationId={detailRegistrationId ?? ''}
        open={!!detailRegistrationId}
        onOpenChange={open => !open && setDetailRegistrationId(null)}
        event={eventInfo}
      />
    </div>
  )
}

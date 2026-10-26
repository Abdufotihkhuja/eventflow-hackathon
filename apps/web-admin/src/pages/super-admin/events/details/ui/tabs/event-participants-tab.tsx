import { useMemo, useState } from 'react'
import { useLocale, useT } from '@eventflow/i18n/react'

import { Download, FileSpreadsheet, FileText, Mail, Search, UserCheck, UserX } from 'lucide-react'

import type { Registration } from '@api/services/registration.types'
import {
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_LABEL_KEYS,
  RegistrationStatus,
} from '@entities/registration'
import {
  useEventRegistrationsQuery,
  useExportRegistrations,
  useApproveRegistration,
  useRejectRegistration,
  useBulkApproveRegistrations,
  useBulkRejectRegistrations,
  useDownloadTicket,
  useDownloadAllTickets,
} from '@features/events/api'
import {
  BulkTicketDownloadMenu,
  RegistrationDetailSheet,
  TicketDownloadMenu,
  type RegistrationDetailSheetEvent,
} from '@features/events/ui'
import { cn, useDebounce } from '@shared/lib'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Skeleton,
  Textarea,
} from '@shared/ui'
import { toast } from 'sonner'

type EventParticipantsTabProps = {
  eventId: string
  /** Данные события для отображения результатов теста и передачи в панель деталей */
  event?: RegistrationDetailSheetEvent | null
}

export function EventParticipantsTab({ eventId, event: eventInfo }: EventParticipantsTabProps) {
  const t = useT()
  const locale = useLocale()
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [detailRegistrationId, setDetailRegistrationId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(searchInput, 500)

  const { data, isLoading, isError, error } = useEventRegistrationsQuery(eventId, {
    page,
    limit: 20,
    status: statusFilter !== 'all' ? (statusFilter as RegistrationStatus) : undefined,
    search: debouncedSearch || undefined,
  })

  const exportMutation = useExportRegistrations(eventId)
  const downloadTicketMutation = useDownloadTicket(eventId)
  const downloadAllTicketsMutation = useDownloadAllTickets(eventId)
  const approveMutation = useApproveRegistration(eventId)
  const rejectMutation = useRejectRegistration(eventId)
  const bulkApproveMutation = useBulkApproveRegistrations(eventId)
  const bulkRejectMutation = useBulkRejectRegistrations(eventId)

  const handleExport = (format: 'csv' | 'xlsx') => {
    exportMutation.mutate({ format })
  }

  const handleDownloadTicket = (
    registrationId: string,
    design: 'branded' | 'simple',
    participantName: string
  ) => {
    downloadTicketMutation.mutate({
      registrationId,
      design,
      participantName,
    })
  }

  const handleDownloadAllTickets = (design: 'branded' | 'simple') => {
    downloadAllTicketsMutation.mutate({
      design,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
  }

  const handleApprove = (registrationId: string) => {
    approveMutation.mutate(registrationId, {
      onSuccess: () => toast.success(t('events.batch1.eventParticipantsTab.s001')),
      onError: () => toast.error(t('events.batch1.eventParticipantsTab.s002')),
    })
  }

  const handleRejectOpen = (registration: Registration) => {
    setRejectTarget(registration)
    setRejectReason('')
  }

  const handleRejectConfirm = () => {
    if (!rejectTarget) return
    rejectMutation.mutate(
      { registrationId: rejectTarget.id, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast.success(t('events.batch1.eventParticipantsTab.s003'))
          setRejectTarget(null)
          setRejectReason('')
        },
        onError: () => toast.error(t('events.batch1.eventParticipantsTab.s004')),
      }
    )
  }

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return
    bulkApproveMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        toast.success(t('events.batch1.eventParticipantsTab.bulkApproved', { count: selectedIds.size }))
        setSelectedIds(new Set())
      },
      onError: () => toast.error(t('events.batch1.eventParticipantsTab.s005')),
    })
  }

  const handleBulkRejectOpen = () => setBulkRejectOpen(true)

  const handleBulkRejectConfirm = () => {
    if (selectedIds.size === 0) return
    bulkRejectMutation.mutate(
      { registrationIds: Array.from(selectedIds), reason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast.success(t('events.batch1.eventParticipantsTab.bulkRejected', { count: selectedIds.size }))
          setSelectedIds(new Set())
          setRejectReason('')
          setBulkRejectOpen(false)
        },
        onError: () => toast.error(t('events.batch1.eventParticipantsTab.s006')),
      }
    )
  }

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setPage(1)
  }

  const handleStatusFilterChange = (status: RegistrationStatus | 'all') => {
    setStatusFilter(status)
    setPage(1)
  }

  const registrations = (data?.data ?? []) as Registration[]
  const pendingRegistrations = useMemo(
    () => registrations.filter(r => r.status === RegistrationStatus.PENDING),
    [registrations]
  )

  // Подсчет одобренных участников для которых доступны билеты
  const approvedCount = useMemo(() => {
    return registrations.filter(r => r.status === RegistrationStatus.APPROVED).length
  }, [registrations])

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('events.batch1.eventParticipantsTab.s007')}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                title={t('events.batch1.eventParticipantsTab.s008')}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">{t('events.batch1.eventParticipantsTab.s009')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />{t('events.batch1.eventParticipantsTab.s010')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                disabled={exportMutation.isPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />{t('events.batch1.eventParticipantsTab.s011')}</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('xlsx')}
                disabled={exportMutation.isPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />{t('events.batch1.eventParticipantsTab.s012')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Билеты */}
          <BulkTicketDownloadMenu
            onDownloadAll={handleDownloadAllTickets}
            isLoading={downloadAllTicketsMutation.isPending}
            ticketsCount={approvedCount}
            disabled={approvedCount === 0}
          />
        </div>
      </div>

      {/* Bulk actions bar */}
      {pendingRegistrations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <span className="text-sm font-medium text-muted-foreground">{t('events.batch1.eventParticipantsTab.s013')}{selectedIds.size}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-success hover:bg-success-soft hover:text-success-soft-foreground"
            disabled={selectedIds.size === 0 || bulkApproveMutation.isPending}
            onClick={handleBulkApprove}
          >
            <UserCheck className="h-4 w-4" />{t('events.batch1.eventParticipantsTab.s014')}</Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:bg-danger-soft hover:text-destructive"
            disabled={selectedIds.size === 0 || bulkRejectMutation.isPending}
            onClick={handleBulkRejectOpen}
          >
            <UserX className="h-4 w-4" />{t('events.batch1.eventParticipantsTab.s015')}</Button>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleStatusFilterChange('all')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
            statusFilter === 'all'
              ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary'
              : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
          )}
        >
          {t('admin.filters.allStatuses')}
        </button>
        {Object.entries(REGISTRATION_STATUS_LABEL_KEYS)
          .filter(([status]) => status !== RegistrationStatus.CONFIRMED) // Скрываем deprecated статус
          .map(([status, labelKey]) => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status as RegistrationStatus)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary'
                  : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
              )}
            >
              {t(labelKey)}
            </button>
          ))}
      </div>

      {/* Registrations List */}
      <div className="space-y-3">
        {isError ? (
          <Card className="p-12">
            <div className="text-center">
              <p className="text-lg font-semibold text-destructive">{t('events.batch1.eventParticipantsTab.s016')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : t('events.batch1.eventParticipantsTab.s017')}
              </p>
              <Button className="mt-4" onClick={() => window.location.reload()}>{t('events.batch1.eventParticipantsTab.s018')}</Button>
            </div>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : registrations.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{t('events.batch1.eventParticipantsTab.s019')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {debouncedSearch || statusFilter !== 'all'
                  ? t('events.batch1.eventParticipantsTab.s020')
                  : t('events.batch1.eventParticipantsTab.s021')}
              </p>
            </div>
          </Card>
        ) : (
          registrations.map((registration: Registration) => (
            <Card key={registration.id} className="p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  {registration.status === RegistrationStatus.PENDING && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(registration.id)}
                      onChange={() => toggleSelected(registration.id)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-input sm:mt-0"
                      aria-label={t('events.batch1.eventParticipantsTab.selectParticipant', {
                        firstName: registration.user.firstName,
                        lastName: registration.user.lastName,
                      })}
                    />
                  )}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-secondary/10 text-sm font-semibold text-brand-secondary sm:h-12 sm:w-12">
                    {registration.user.firstName[0]}
                    {registration.user.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-foreground">
                        {registration.user.firstName} {registration.user.lastName}
                      </p>
                      <Badge
                        className={cn('border', REGISTRATION_STATUS_COLORS[registration.status])}
                      >
                        {t(REGISTRATION_STATUS_LABEL_KEYS[registration.status])}
                      </Badge>
                      {eventInfo?.registrationMode === 'TEST' &&
                        registration.testScore != null && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'border',
                              registration.testPassed
                                ? 'border-success/20 bg-success-soft text-success-soft-foreground'
                                : 'border-warning/20 bg-warning-soft text-warning-soft-foreground'
                            )}
                          >{t('events.batch1.eventParticipantsTab.s022')}{registration.testScore}
                            {eventInfo?.maxTestScore != null
                              ? ` / ${eventInfo.maxTestScore}`
                              : ''}
                            {registration.testPassed ? ' ✓' : ''}
                          </Badge>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{registration.user.email}</span>
                      </span>
                      {registration.user.phone && <span>{registration.user.phone}</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground/70">{t('events.batch1.eventParticipantsTab.s023')}{' '}
                      {new Date(registration.createdAt).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {(registration.answers?.length ?? 0) > 0 && (
                        <>
                          {' · '}
                          <button
                            type="button"
                            onClick={() => setDetailRegistrationId(registration.id)}
                            className="text-brand-secondary underline hover:no-underline"
                          >{t('events.batch1.eventParticipantsTab.s024')}{registration.answers?.length ?? 0})
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 sm:border-0 sm:pt-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => setDetailRegistrationId(registration.id)}
                    title={t('events.batch1.eventParticipantsTab.s025')}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('events.batch1.eventParticipantsTab.s026')}</span>
                  </Button>
                  {registration.status === RegistrationStatus.PENDING && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-success"
                        disabled={approveMutation.isPending}
                        onClick={() => handleApprove(registration.id)}
                      >
                        <UserCheck className="h-4 w-4" />
                        <span className="hidden xs:inline">{t('events.batch1.eventParticipantsTab.s027')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive"
                        disabled={rejectMutation.isPending}
                        onClick={() => handleRejectOpen(registration)}
                      >
                        <UserX className="h-4 w-4" />
                        <span className="hidden xs:inline">{t('events.batch1.eventParticipantsTab.s028')}</span>
                      </Button>
                    </>
                  )}
                  {registration.status === RegistrationStatus.APPROVED && (
                    <TicketDownloadMenu
                      onDownload={design =>
                        handleDownloadTicket(
                          registration.id,
                          design,
                          `${registration.user.firstName}_${registration.user.lastName}`
                        )
                      }
                      isLoading={downloadTicketMutation.isPending}
                      showLabel={false}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >{t('events.batch1.eventParticipantsTab.s029')}</Button>
          <span className="text-sm text-muted-foreground">{t('events.batch1.eventParticipantsTab.s030')}{page}{t('events.batch1.eventParticipantsTab.s031')}{data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.totalPages}
          >{t('events.batch1.eventParticipantsTab.s032')}</Button>
        </div>
      )}

      {/* Диалог отклонения одной регистрации */}
      <AlertDialog open={!!rejectTarget} onOpenChange={open => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.batch1.eventParticipantsTab.s033')}</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget && (
                <>{t('events.batch1.eventParticipantsTab.s033')}{rejectTarget.user.firstName} {rejectTarget.user.lastName}{t('events.batch1.eventParticipantsTab.s034')}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {rejectTarget && (
            <Textarea
              placeholder={t('events.batch1.eventParticipantsTab.s035')}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="mt-2 min-h-[80px]"
              maxLength={500}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectTarget(null)}>{t('events.batch1.eventParticipantsTab.s036')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending ? t('events.batch1.eventParticipantsTab.s037') : t('events.batch1.eventParticipantsTab.s028')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог массового отклонения */}
      <AlertDialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.batch1.eventParticipantsTab.s038')}</AlertDialogTitle>
            <AlertDialogDescription>{t('events.batch1.eventParticipantsTab.s028')} {selectedIds.size}{t('events.batch1.eventParticipantsTab.s039')}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder={t('events.batch1.eventParticipantsTab.s035')}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="mt-2 min-h-[80px]"
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkRejectOpen(false)}>{t('events.batch1.eventParticipantsTab.s036')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRejectConfirm}
              disabled={bulkRejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkRejectMutation.isPending ? t('events.batch1.eventParticipantsTab.s037') : t('events.batch1.eventParticipantsTab.s028')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Панель деталей регистрации (ответы на вопросы и результат теста) */}
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

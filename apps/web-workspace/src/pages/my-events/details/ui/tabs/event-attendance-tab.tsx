import { useMemo, useState } from 'react'

import {
  CalendarCheck,
  CalendarClock,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import type { EventCheckpoint } from '@api/services'
import {
  useAttendanceQuery,
  useAttendanceStatsQuery,
  useCheckpointAttendanceQuery,
} from '@features/events/api'
import { EventCheckpointsManager } from '@features/events/ui'
import {
  exportAttendanceToCsv,
  exportAttendanceToExcel,
  type AttendanceExportRow,
} from '@features/events/lib/attendance-export'
import { cn, parseCalendarDate } from '@shared/lib'
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  FilterChip,
  Skeleton,
  StatTile,
} from '@shared/ui'

import { EventTabHeader } from '../event-tab-header'

type EventAttendanceTabProps = {
  eventId: string
  eventName?: string
  /** ISO-дата начала события: дефолты для первого чекпоинта. */
  eventStartDate?: string
}

type AttendanceRecord = {
  id: string
  eventId: string
  registrationId?: string
  participantId?: string
  date: string
  status: 'present' | 'absent' | 'pending'
  checkInTime?: string
  checkOutTime?: string
  notes?: string
  registration?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

/** Две оси одной и той же матрицы: календарные дни или окна чекпоинтов. */
type AttendanceView = 'days' | 'checkpoints'

export function EventAttendanceTab({
  eventId,
  eventName,
  eventStartDate,
}: EventAttendanceTabProps) {
  const { locale, t } = useI18n()
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | null>(null)
  const [checkpointsOpen, setCheckpointsOpen] = useState(false)
  // null — режим ещё не выбран руками: показываем чекпоинты, если они заведены.
  const [viewOverride, setViewOverride] = useState<AttendanceView | null>(null)

  // Грузим всю матрицу целиком: фильтр по дню — клиентский, иначе ответ теряет
  // остальные даты и переключатель дней исчезает вместе с ними.
  const { data, isLoading, isError, refetch } = useAttendanceQuery({ eventId })
  const { data: statsData, isLoading: isStatsLoading } = useAttendanceStatsQuery(eventId)
  const {
    data: checkpointData,
    isLoading: isCheckpointsLoading,
    isError: isCheckpointsError,
    refetch: refetchCheckpoints,
  } = useCheckpointAttendanceQuery(eventId)

  const allDates = data?.dates ?? []
  const allRecords = data?.records ?? []
  const dates = selectedDate && allDates.includes(selectedDate) ? [selectedDate] : allDates

  const checkpoints = useMemo(
    () =>
      [...(checkpointData?.checkpoints ?? [])].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt)
      ),
    [checkpointData?.checkpoints]
  )
  const checkpointParticipants = checkpointData?.participants ?? []
  const hasCheckpoints = checkpoints.length > 0
  const view: AttendanceView = viewOverride ?? (hasCheckpoints ? 'checkpoints' : 'days')

  const checkpointLabel = (checkpoint: EventCheckpoint) =>
    `${checkpoint.name} (${formatDate(new Date(checkpoint.startsAt), locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}–${formatDate(new Date(checkpoint.endsAt), locale, {
      hour: '2-digit',
      minute: '2-digit',
    })})`

  const hasRecordsForExport =
    view === 'checkpoints'
      ? checkpointParticipants.length > 0 && checkpoints.length > 0
      : allRecords.length > 0

  const buildDayExport = () => {
    // Матрица пересобирается локально — та же форма, что рисует таблица.
    const matrix = allRecords.reduce(
      (acc, record) => {
        const r = record as unknown as AttendanceRecord
        const key = r.registrationId ?? r.participantId
        if (!acc[key]) acc[key] = {}
        acc[key][r.date] = r
        return acc
      },
      {} as Record<string, Record<string, AttendanceRecord>>
    )
    const rows: AttendanceExportRow[] = Object.values(matrix).map(recs => {
      const first = Object.values(recs)[0]
      const fullName = first?.registration
        ? `${first.registration.firstName} ${first.registration.lastName}`.trim()
        : ''
      const email = first?.registration?.email ?? ''
      const cells: AttendanceExportRow['cells'] = {}
      for (const iso of dates) {
        const rec = recs[iso]
        cells[iso] =
          rec?.status === 'present'
            ? 'present'
            : rec?.status === 'absent'
              ? 'absent'
              : undefined
      }
      const attendedDays = dates.filter(iso => recs[iso]?.status === 'present').length
      return { fullName, email, cells, attendedDays, totalDays: dates.length }
    })
    return {
      rows,
      columns: dates,
      formatHeader: (iso: string) =>
        formatDate(parseCalendarDate(iso), locale, { day: 'numeric', month: 'short' }),
    }
  }

  const buildCheckpointExport = () => {
    const columns = checkpoints.map(checkpoint => checkpoint.id)
    const labels = new Map(checkpoints.map(cp => [cp.id, checkpointLabel(cp)]))
    const rows: AttendanceExportRow[] = checkpointParticipants.map(participant => {
      const marked = new Set(participant.checkpointIds)
      const cells: AttendanceExportRow['cells'] = {}
      for (const id of columns) {
        cells[id] = marked.has(id) ? 'present' : 'absent'
      }
      return {
        fullName: participant.fullName,
        email: participant.email,
        cells,
        attendedDays: participant.attendedCount,
        totalDays: columns.length,
      }
    })
    return {
      rows,
      columns,
      formatHeader: (id: string) => labels.get(id) ?? id,
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const { rows, columns, formatHeader } =
      view === 'checkpoints' ? buildCheckpointExport() : buildDayExport()

    if (rows.length === 0 || columns.length === 0) {
      toast.message(t('events.attendance.exportEmpty'))
      return
    }

    const labels = {
      sheetName: t('events.attendance.exportSheetName'),
      attendee: t('events.attendance.colAttendee'),
      email: t('events.attendance.colEmail'),
      attended: t('events.attendance.colAttended'),
      present: t('events.attendance.presentShort'),
      absent: t('events.attendance.absentShort'),
    }
    const fileStem = `${eventName ?? 'event'}-attendance${
      view === 'checkpoints' ? '-checkpoints' : ''
    }`

    setExportingFormat(format)
    try {
      if (format === 'xlsx') {
        await exportAttendanceToExcel({
          rows,
          dates: columns,
          fileStem,
          labels,
          formatDateHeader: formatHeader,
        })
      } else {
        exportAttendanceToCsv({
          rows,
          dates: columns,
          fileStem,
          labels,
          formatDateHeader: formatHeader,
        })
      }
      toast.success(t('events.attendance.exportDone', { count: rows.length }))
    } catch (err) {
      console.error('Failed to export attendance', err)
      toast.error(t('events.attendance.exportError'))
    } finally {
      setExportingFormat(null)
    }
  }

  const header = (
    <EventTabHeader
      kicker={eventName}
      title={t('events.attendance.title')}
      description={t('events.attendance.description')}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCheckpointsOpen(true)}
          >
            <CalendarClock className="size-4" />
            <span className="hidden sm:inline">
              {t('events.checkpoints.manageButton')}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                title={t('events.attendance.exportButtonTitle')}
                disabled={!hasRecordsForExport || exportingFormat !== null}
              >
                {exportingFormat !== null ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="size-4" />
                )}
                <span className="hidden sm:inline">{t('actions.export')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Download className="size-4 text-muted-foreground" />
                {t('events.attendance.exportMenuTitle')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                disabled={exportingFormat !== null || !hasRecordsForExport}
                className="gap-2"
              >
                {exportingFormat === 'csv' ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <FileText className="size-3.5 text-muted-foreground" />
                )}
                {t('events.attendance.exportCsv')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('xlsx')}
                disabled={exportingFormat !== null || !hasRecordsForExport}
                className="gap-2"
              >
                {exportingFormat === 'xlsx' ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <FileSpreadsheet className="size-3.5 text-muted-foreground" />
                )}
                {t('events.attendance.exportExcel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  )

  const checkpointsManager = (
    <EventCheckpointsManager
      eventId={eventId}
      eventStartDate={eventStartDate}
      open={checkpointsOpen}
      onOpenChange={setCheckpointsOpen}
    />
  )

  if (isLoading || isStatsLoading || isCheckpointsLoading) {
    return (
      <div className="space-y-5">
        {header}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        {checkpointsManager}
      </div>
    )
  }

  if (isError || isCheckpointsError) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState
          title={t('events.attendance.loadErrorTitle')}
          description={t('events.attendance.loadErrorDescription')}
          onRetry={() => {
            void refetch()
            void refetchCheckpoints()
          }}
          retryLabel={t('actions.retry')}
        />
        {checkpointsManager}
      </div>
    )
  }

  const participantRecords = allRecords.reduce(
    (acc, record) => {
      const r = record as unknown as AttendanceRecord
      const key = r.registrationId ?? r.participantId
      if (!acc[key]) acc[key] = {}
      acc[key][r.date] = r
      return acc
    },
    {} as Record<string, Record<string, AttendanceRecord>>
  )
  const participantIds = Object.keys(participantRecords)

  // Сколько ЧЕЛОВЕК отмечено в каждый день — показываем прямо в шапке колонки.
  // Считаем по схлопнутой матрице, а не по сырым записям: у участника может быть
  // несколько отметок за день (по одной на чекпоинт), и сумма строк дала бы
  // невозможное «332 / 150».
  const presentByDate = Object.values(participantRecords).reduce(
    (acc, recs) => {
      for (const [date, record] of Object.entries(recs)) {
        if (record.status === 'present') acc[date] = (acc[date] ?? 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  const registered = statsData?.totalRegistrations ?? participantIds.length
  const attended =
    statsData?.totalAttended ??
    Object.values(participantRecords).reduce(
      (sum, recs) => sum + (dates.some(date => recs[date]?.status === 'present') ? 1 : 0),
      0
    )
  const rate = registered > 0 ? Math.round((attended / registered) * 100) : 0

  return (
    <div className="space-y-5">
      {header}

      {/* Real attendance metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={t('events.attendance.statRegistered')} value={registered.toLocaleString()} />
        <StatTile label={t('events.attendance.statAttended')} value={attended.toLocaleString()} />
        <StatTile
          label={t('events.attendance.statRate')}
          value={`${rate}%`}
          tone={rate >= 75 ? 'positive' : 'default'}
        />
      </div>

      {/* Ось матрицы: дни или чекпоинты. Переключатель нужен, только когда есть что переключать. */}
      {hasCheckpoints && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={view === 'checkpoints'}
            onClick={() => setViewOverride('checkpoints')}
          >
            {t('events.checkpoints.viewByCheckpoints')}
          </FilterChip>
          <FilterChip active={view === 'days'} onClick={() => setViewOverride('days')}>
            {t('events.checkpoints.viewByDays')}
          </FilterChip>
        </div>
      )}

      {view === 'checkpoints' ? (
        checkpointParticipants.length === 0 ? (
          <Card className="py-4">
            <EmptyState
              icon={CalendarClock}
              title={t('events.checkpoints.matrixEmptyTitle')}
              description={t('events.checkpoints.matrixEmptyDescription')}
            />
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 text-left">
                    {t('events.attendance.colAttendee')}
                  </th>
                  {checkpoints.map(checkpoint => {
                    const startsAt = new Date(checkpoint.startsAt)
                    const endsAt = new Date(checkpoint.endsAt)
                    return (
                      <th
                        key={checkpoint.id}
                        className="px-3 py-2.5 text-center font-semibold"
                      >
                        <div className="normal-case tracking-normal text-foreground">
                          {checkpoint.name}
                        </div>
                        <div className="font-mono text-[11px] font-normal tabular-nums text-muted-foreground">
                          {formatDate(startsAt, locale, {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {'–'}
                          {formatDate(endsAt, locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div
                          className={cn(
                            'mt-1 font-mono text-[11px] font-normal normal-case tracking-normal tabular-nums',
                            checkpoint.checkedInCount > 0
                              ? 'text-success'
                              : 'text-muted-foreground/60'
                          )}
                          title={t('events.checkpoints.checkpointAttendedTitle', {
                            count: checkpoint.checkedInCount,
                            total: checkpointParticipants.length,
                          })}
                        >
                          {checkpoint.checkedInCount} / {checkpointParticipants.length}
                        </div>
                      </th>
                    )
                  })}
                  <th className="px-4 py-2.5 text-center">
                    {t('events.attendance.colAttended')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {checkpointParticipants.map(participant => {
                  const marked = new Set(participant.checkpointIds)
                  return (
                    <tr
                      key={participant.registrationId}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {participant.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.email}
                        </p>
                      </td>
                      {checkpoints.map(checkpoint => (
                        <td key={checkpoint.id} className="px-3 py-3 text-center">
                          {marked.has(checkpoint.id) ? (
                            <Check
                              className="mx-auto size-4 text-success"
                              aria-label={t('events.attendance.present')}
                            />
                          ) : (
                            <X
                              className="mx-auto size-4 text-muted-foreground/50"
                              aria-label={t('events.attendance.absent')}
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'font-mono text-[12px] tabular-nums',
                            participant.attendedCount === checkpoints.length &&
                              checkpoints.length > 0
                              ? 'font-semibold text-success'
                              : 'text-muted-foreground'
                          )}
                        >
                          {participant.attendedCount} / {checkpoints.length}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          {/* Day filter */}
          {allDates.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!selectedDate} onClick={() => setSelectedDate(undefined)}>
                {t('events.attendance.allDays')}
              </FilterChip>
              {allDates.map(date => (
                <FilterChip
                  key={date}
                  active={selectedDate === date}
                  onClick={() => setSelectedDate(date)}
                >
                  {formatDate(parseCalendarDate(date), locale, {
                    day: 'numeric',
                    month: 'short',
                  })}
                </FilterChip>
              ))}
            </div>
          )}

          {/* Attendance matrix */}
          {participantIds.length === 0 ? (
            <Card className="py-4">
              <EmptyState
                icon={CalendarCheck}
                title={t('events.attendance.emptyTitle')}
                description={t('events.attendance.emptyDescription')}
              />
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 text-left">{t('events.attendance.colAttendee')}</th>
                    {dates.map(date => {
                      const presentCount = presentByDate[date] ?? 0
                      return (
                        <th key={date} className="px-3 py-2.5 text-center font-semibold">
                          <div className="text-foreground">
                            {formatDate(parseCalendarDate(date), locale, {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                          <div className="font-normal text-muted-foreground">
                            {formatDate(parseCalendarDate(date), locale, { weekday: 'short' })}
                          </div>
                          <div
                            className={cn(
                              'mt-1 font-mono text-[11px] font-normal normal-case tracking-normal tabular-nums',
                              presentCount > 0 ? 'text-success' : 'text-muted-foreground/60'
                            )}
                            title={t('events.attendance.dayAttendedTitle', {
                              count: presentCount,
                              total: participantIds.length,
                            })}
                          >
                            {presentCount} / {participantIds.length}
                          </div>
                        </th>
                      )
                    })}
                    <th className="px-4 py-2.5 text-center">{t('events.attendance.colAttended')}</th>
                  </tr>
                </thead>
                <tbody>
                  {participantIds.map(participantId => {
                    const recs = participantRecords[participantId]
                    const attendedDays = dates.filter(date => recs[date]?.status === 'present').length
                    const totalDays = dates.length
                    const first = Object.values(recs)[0]
                    const name = first?.registration
                      ? `${first.registration.firstName} ${first.registration.lastName}`
                      : `#${participantId.slice(0, 8)}`

                    return (
                      <tr key={participantId} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{name}</p>
                          {first?.registration?.email && (
                            <p className="text-xs text-muted-foreground">{first.registration.email}</p>
                          )}
                        </td>
                        {dates.map(date => {
                          const record = recs[date]
                          return (
                            <td key={date} className="px-3 py-3 text-center">
                              {record?.status === 'present' ? (
                                <Check className="mx-auto size-4 text-success" aria-label={t('events.attendance.present')} />
                              ) : record?.status === 'absent' ? (
                                <X className="mx-auto size-4 text-muted-foreground/50" aria-label={t('events.attendance.absent')} />
                              ) : (
                                <span className="text-muted-foreground/40">–</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'font-mono text-[12px] tabular-nums',
                              attendedDays === totalDays && totalDays > 0
                                ? 'font-semibold text-success'
                                : 'text-muted-foreground'
                            )}
                          >
                            {attendedDays} / {totalDays}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {checkpointsManager}
    </div>
  )
}

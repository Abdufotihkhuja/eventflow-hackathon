import { useState } from 'react'
import { Download, FileText, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import type {
  Registration,
  RegistrationAnswerFile,
} from '@api/services/registration.types'
import { eventRegistrationsService } from '@api/services'
import { getRegistrationStatusLabel } from '@entities/registration'
import { useRegistrationQuery } from '@features/events/api'
import { getRegistrationPhone } from '@features/events/lib/registration-phone'
import { cn } from '@shared/lib/cn'
import { formatUserName } from '@shared/lib/format-user-name'
import {
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

export type RegistrationDetailSheetEvent = {
  registrationMode?: string | null
  minTestScore?: number | null
  maxTestScore?: number | null
}

type Props = {
  eventId: string
  registrationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: RegistrationDetailSheetEvent | null
}

const PAYMENT_LABEL_KEY: Record<NonNullable<Registration['paymentStatus']>, string> = {
  paid: 'events.participants.paymentPaid',
  pending: 'events.participants.paymentPending',
  refunded: 'events.participants.paymentRefunded',
  failed: 'events.participants.paymentFailed',
}

export function RegistrationDetailSheet({
  eventId,
  registrationId,
  open,
  onOpenChange,
  event: eventInfo,
}: Props) {
  const { t } = useI18n()
  const { data: registration, isLoading, isError } = useRegistrationQuery(eventId, registrationId, {
    enabled: open && !!registrationId,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md" aria-describedby={undefined}>
        <SheetHeader className="sr-only">
          <SheetTitle>{t('events.participants.detailTitle')}</SheetTitle>
        </SheetHeader>
        {/* Radix wraps content in a display:table div that breaks `truncate`
            (a long file name would push the download button out of view).
            Force the viewport's inner wrapper back to block. Scoped to this
            vertical ScrollArea — the shared component keeps display:table for
            horizontal ScrollAreas (e.g. the kanban board). */}
        <ScrollArea className="flex-1 pr-4 [&>div>div]:!block">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              {t('events.participants.loadDetailError')}
            </p>
          )}
          {registration && (
            <RegistrationDetailContent
              registration={registration}
              eventInfo={eventInfo}
              eventId={eventId}
              registrationId={registrationId}
            />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function FileAnswerList({
  eventId,
  registrationId,
  files,
}: {
  eventId: string
  registrationId: string
  files: RegistrationAnswerFile[]
}) {
  const { t } = useI18n()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  if (files.length === 0) {
    return <p className="mt-1 text-sm text-muted-foreground">—</p>
  }

  const handleDownload = async (file: RegistrationAnswerFile) => {
    setDownloadingId(file.id)
    try {
      const blob = await eventRegistrationsService.downloadAnswerFile(
        eventId,
        registrationId,
        file.id,
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.originalName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('events.participants.fileDownloadError'))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <ul className="mt-2 space-y-2">
      {files.map(file => (
        <li
          key={file.id}
          className="flex items-center gap-2 rounded-md border border-border bg-background p-2"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm text-foreground"
              title={file.originalName}
            >
              {file.originalName}
            </p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleDownload(file)}
            disabled={downloadingId === file.id}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label={t('events.participants.fileDownload')}
            title={t('events.participants.fileDownload')}
          >
            {downloadingId === file.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

function RegistrationDetailContent({
  registration,
  eventInfo,
  eventId,
  registrationId,
}: {
  registration: Registration
  eventInfo?: RegistrationDetailSheetEvent | null
  eventId: string
  registrationId: string
}) {
  const { locale, t } = useI18n()
  const { user, status, createdAt, confirmedAt, rejectedAt, cancelledAt, rejectionReason } = registration
  const phone = getRegistrationPhone(registration)
  const hasTest = eventInfo?.registrationMode === 'TEST' && registration.testScore != null
  const hasAnswers = (registration.answers?.length ?? 0) > 0

  const dateTime = (value: string) =>
    formatDate(value, locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const payAmount =
    registration.paymentAmount != null
      ? `${registration.paymentAmount.toLocaleString()} ${registration.paymentCurrency ?? ''}`.trim()
      : null
  const hasPayment = payAmount != null || registration.paymentStatus != null

  // Honest timeline — only real registration lifecycle events.
  const timeline = [
    { key: 'registered', label: t('events.participants.timelineRegistered'), at: createdAt },
    confirmedAt ? { key: 'confirmed', label: t('events.participants.timelineConfirmed'), at: confirmedAt } : null,
    rejectedAt ? { key: 'rejected', label: t('events.participants.timelineRejected'), at: rejectedAt, note: rejectionReason } : null,
    cancelledAt ? { key: 'cancelled', label: t('events.participants.timelineCancelled'), at: cancelledAt } : null,
  ]
    .filter((e): e is { key: string; label: string; at: string; note?: string } => e != null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return (
    <div className="space-y-6 pb-8">
      {/* Attendee */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('events.participants.attendeeSection')}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">
          {formatUserName(user.firstName, user.lastName) || user.email}
        </h3>
        <div className="mt-1">
          <StatusPill tone={statusPillTone(status)} size="sm">
            {getRegistrationStatusLabel(t)(status)}
          </StatusPill>
        </div>
        <a
          href={`mailto:${user.email}`}
          className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Mail className="size-4 shrink-0" />
          {user.email}
        </a>
        {phone && <p className="mt-1 text-sm text-muted-foreground">{phone}</p>}
      </section>

      {/* Real registration details */}
      <section className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-lg border border-border bg-card p-4">
        <DetailField label={t('events.participants.colRegistered')}>
          <span className="font-normal">{dateTime(createdAt)}</span>
        </DetailField>
        {registration.qrCode && (
          <DetailField label={t('events.participants.ticketCodeLabel')}>
            <span className="font-mono text-xs">{registration.qrCode}</span>
          </DetailField>
        )}
        {hasPayment && (
          <DetailField label={t('events.participants.paymentLabel')}>
            {payAmount ? (
              <span className="font-mono">{payAmount}</span>
            ) : registration.paymentStatus ? (
              <StatusPill tone={statusPillTone(registration.paymentStatus)} size="sm">
                {t(PAYMENT_LABEL_KEY[registration.paymentStatus])}
              </StatusPill>
            ) : null}
          </DetailField>
        )}
      </section>

      {/* Honest timeline */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('events.participants.timelineTitle')}
        </p>
        <ol className="space-y-3">
          {timeline.map(entry => (
            <li key={entry.key} className="flex gap-3">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{entry.label}</p>
                <p className="font-mono text-[12px] text-muted-foreground">{dateTime(entry.at)}</p>
                {entry.note && <p className="mt-0.5 text-xs text-muted-foreground">{entry.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Test result */}
      {hasTest && (
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('events.participants.testResultSection')}
          </p>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {registration.testScore}
              {eventInfo?.maxTestScore != null ? ` / ${eventInfo.maxTestScore}` : ''}
            </span>
            <StatusPill tone={registration.testPassed ? 'success' : 'warning'} size="sm">
              {registration.testPassed
                ? t('events.participants.testPassed')
                : t('events.participants.testFailed')}
            </StatusPill>
          </div>
        </section>
      )}

      {/* Registration answers */}
      {hasAnswers ? (
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('events.participants.answersSection')}
          </p>
          <ul className="space-y-3">
            {registration.answers!.map(a => {
              const isFileQuestion = a.question.type === 'FILE_UPLOAD'
              const files = isFileQuestion
                ? (registration.fileUploads ?? []).filter(
                    f => f.questionId === a.question.id,
                  )
                : []
              return (
                <li key={a.id} className={cn('rounded-lg border border-border bg-card p-3')}>
                  <p className="text-sm font-medium text-foreground">
                    {a.question.question}
                    {a.question.isRequired && <span className="ml-1 text-destructive">*</span>}
                  </p>
                  {isFileQuestion ? (
                    <FileAnswerList
                      eventId={eventId}
                      registrationId={registrationId}
                      files={files}
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {a.answer || '—'}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{t('events.participants.noAnswers')}</p>
      )}
    </div>
  )
}

import { Mail, FileQuestion, Award, Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { Registration } from '@api/services/registration.types'
import { REGISTRATION_STATUS_COLORS, REGISTRATION_STATUS_LABEL_KEYS } from '@entities/registration'
import { useRegistrationQuery } from '@features/events/api'
import { cn } from '@shared/lib/cn'
import {
  Badge,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

export function RegistrationDetailSheet({
  eventId,
  registrationId,
  open,
  onOpenChange,
  event: eventInfo,
}: Props) {
  const t = useT()
  const { data: registration, isLoading, isError } = useRegistrationQuery(
    eventId,
    registrationId,
    { enabled: open && !!registrationId }
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md"
        aria-describedby={undefined}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t('registrations.detail.title')}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              {t('registrations.detail.loadError')}
            </p>
          )}
          {registration && (
            <RegistrationDetailContent
              registration={registration}
              eventInfo={eventInfo}
            />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function RegistrationDetailContent({
  registration,
  eventInfo,
}: {
  registration: Registration
  eventInfo?: RegistrationDetailSheetEvent | null
}) {
  const t = useT()
  const { user, status, createdAt, answers, testScore, testPassed } = registration
  const hasTest = eventInfo?.registrationMode === 'TEST' && testScore != null
  const hasAnswers = answers && answers.length > 0

  return (
    <div className="space-y-6 pb-8">
      {/* Участник */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('registrations.role.participant')}
        </h3>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={cn('border', REGISTRATION_STATUS_COLORS[status])}>
              {t(REGISTRATION_STATUS_LABEL_KEYS[status])}
            </Badge>
          </div>
          <a
            href={`mailto:${user.email}`}
            className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-4 w-4 shrink-0" />
            {user.email}
          </a>
          {user.phone && (
            <p className="mt-1 text-sm text-muted-foreground">{user.phone}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground/80">
            {t('registrations.detail.registered')}:{' '}
            {new Date(createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </section>

      {/* Результат теста */}
      {hasTest && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Award className="h-4 w-4" />
            {t('registrations.detail.testResult')}
          </h3>
          <div
            className={cn(
              'rounded-lg border p-4',
              testPassed
                ? 'border-success/20 bg-success-soft'
                : 'border-warning/20 bg-warning-soft'
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-foreground">
                {testScore}
                {eventInfo?.maxTestScore != null ? ` / ${eventInfo.maxTestScore}` : ''}
              </span>
              {eventInfo?.minTestScore != null && (
                <span className="text-sm text-muted-foreground">
                  ({t('registrations.detail.minimum')}: {eventInfo.minTestScore})
                </span>
              )}
              <Badge
                variant={testPassed ? 'default' : 'secondary'}
                className={
                  testPassed
                    ? 'bg-success-soft text-success-soft-foreground'
                    : 'bg-warning-soft text-warning-soft-foreground'
                }
              >
                {testPassed ? t('registrations.detail.passed') : t('registrations.detail.failed')}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {/* Ответы на вопросы */}
      {hasAnswers && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FileQuestion className="h-4 w-4" />
            {t('registrations.detail.answers')}
          </h3>
          <ul className="space-y-3">
            {answers.map(a => (
              <li
                key={a.id}
                className="rounded-lg border bg-muted/20 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {a.question.question}
                  {a.question.isRequired && (
                    <span className="ml-1 text-destructive" aria-label={t('validation.required')}>
                      *
                    </span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {a.answer || '—'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasAnswers && !hasTest && (
        <p className="text-center text-sm text-muted-foreground">
          {t('registrations.detail.noAnswers')}
        </p>
      )}
    </div>
  )
}

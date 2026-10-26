import { Link, useParams } from 'react-router-dom'

import { ArrowLeft, Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { EditEventForm, useEventQuery } from '@features/events'
import { Button } from '@shared/ui'

export default function EditEventPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const eventId = id ?? ''
  const isInvalidEventId = eventId.trim() === ''
  const { data: event, isLoading, isError, error } = useEventQuery(eventId, !isInvalidEventId)

  // Проверяем валидность ID из URL
  if (isInvalidEventId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">{t('events.details.invalidId')}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/my-events">{t('events.details.backToList')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Загружаем событие с сервера
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.details.loading')}</p>
        </div>
      </div>
    )
  }

  if (isError || !event) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            {error?.message ?? t('events.details.notFound')}
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/my-events">{t('events.details.backToList')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button asChild variant="outline" size="sm">
          <Link to={`/my-events/${event.id}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('actions.back')}</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t('events.form.editTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('events.form.editDescription')}
          </p>
        </div>
      </div>

      {/* Form */}
      <EditEventForm event={event} />
    </div>
  )
}

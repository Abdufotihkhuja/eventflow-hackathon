/**
 * Страница редактирования события для супер-админа
 * /admin/events/:id/edit
 */

import { Link, useParams } from 'react-router-dom'

import { ArrowLeft, Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { useAdminEventQuery } from '@features/super-admin'
import { Button } from '@shared/ui'

import { AdminEditEventForm } from './admin-edit-event-form'

export default function AdminEditEventPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()

  const { data: event, isLoading, isError, error } = useAdminEventQuery(id ?? '')

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
            <Link to="/admin/events">{t('events.details.backToList')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/events/${event.id}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('admin.actions.back')}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t('admin.events.editTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('admin.events.editSubtitle')} <strong>{event.title}</strong>
          </p>
        </div>
      </div>

      {/* Form */}
      <AdminEditEventForm event={event} />
    </div>
  )
}

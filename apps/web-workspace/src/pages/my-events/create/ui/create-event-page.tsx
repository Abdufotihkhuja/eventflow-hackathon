import { Link } from 'react-router-dom'

import { ArrowLeft } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { CreateEventForm } from '@features/events'
import { Button } from '@shared/ui'

export default function CreateEventPage() {
  const t = useT()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/my-events" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('actions.back')}</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground sm:text-3xl">
            {t('events.form.createTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
            {t('events.form.createDescription')}
          </p>
        </div>
      </div>

      {/* Form */}
      <CreateEventForm />
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AlertCircle, Copy, Edit, Loader2, MoreVertical, Trash2 } from 'lucide-react'
import { formatDate, getCityLabel } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { MEDIA_BASE_URL } from '@api/config'
import {
  getEventFormatLabel,
  getEventStatusLabel,
  getEventTypeLabel,
  type Event,
} from '@entities/event'
import { useDeleteEvent, useDuplicateEvent } from '@features/events/api'
import { getBannerTemplateGradient, isBannerTemplate } from '@features/events/lib/banner-templates'
import { cn } from '@shared/lib/cn'
import { getDescriptionText } from '@shared/lib'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

const getMediaUrl = (url: string) => {
  if (!url || url.startsWith('http') || url.startsWith('blob:')) return url
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function CardCover({ event }: { event: Event }) {
  if (event.coverImage && isBannerTemplate(event.coverImage)) {
    return <div className={cn('size-full', getBannerTemplateGradient(event.coverImage) ?? 'bg-muted')} />
  }
  if (event.coverImage) {
    return (
      <img
        src={getMediaUrl(event.coverImage)}
        alt=""
        className="size-full object-cover"
        loading="lazy"
      />
    )
  }
  return (
    <div className="flex size-full items-center justify-center bg-muted">
      <img src="/icon.svg" alt="" className="size-12 opacity-30" loading="lazy" />
    </div>
  )
}

export function EventCard({ event }: { event: Event }) {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const deleteEvent = useDeleteEvent()
  const duplicateEvent = useDuplicateEvent()

  const detailHref = `/my-events/${event.id}`
  const startDate = new Date(event.startDate)
  const endDate = new Date(event.endDate)
  const isMultiDay = startDate.toDateString() !== endDate.toDateString()

  const sold = event._count?.registrations ?? 0
  const cap = event.maxParticipants ?? 0
  const pct = cap ? Math.min(100, Math.round((sold / cap) * 100)) : 0
  const barTone = pct >= 90 ? 'bg-primary' : pct >= 75 ? 'bg-warning' : 'bg-foreground'

  const whenStr = isMultiDay
    ? `${formatDate(startDate, locale, { day: 'numeric', month: 'short' })} — ${formatDate(endDate, locale, { day: 'numeric', month: 'short' })}`
    : formatDate(startDate, locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const cityLabel = event.city ? getCityLabel(t)(event.city) : ''
  const place = [event.venue, cityLabel].filter(Boolean).join(', ')
  const meta = [whenStr, place].filter(Boolean).join(' · ')

  const description =
    event.shortDescription || getDescriptionText(event.description) || ''

  const handleDuplicate = () =>
    duplicateEvent.mutate(event, { onSuccess: dup => navigate(`/my-events/${dup.id}/edit`) })

  return (
    <Card className="group flex h-full flex-col overflow-hidden p-0">
      <Link
        to={detailHref}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <CardCover event={event} />
          <div className="absolute right-3 top-3">
            <StatusPill tone={statusPillTone(event.status)} size="sm">
              {getEventStatusLabel(t)(event.status)}
            </StatusPill>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <Link
            to={detailHref}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground transition-colors group-hover:text-foreground/80">
              {event.title}
            </h3>
          </Link>
          {meta && (
            <p className="truncate font-mono text-[12px] text-muted-foreground">{meta}</p>
          )}
        </div>

        {description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <MetaTag>{getEventTypeLabel(t)(event.type)}</MetaTag>
          <MetaTag>{getEventFormatLabel(t)(event.format)}</MetaTag>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 font-mono text-[12px]">
            <span className="text-foreground">
              {sold.toLocaleString()}
              {cap > 0 && <span className="text-muted-foreground"> / {cap.toLocaleString()}</span>}
            </span>
            {cap > 0 && <span className="text-muted-foreground">{pct}%</span>}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', barTone)} style={{ width: `${cap ? pct : 0}%` }} />
          </div>
        </div>

        {event.registrationDeadline && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-[11px] font-medium text-warning-soft-foreground">
            <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
            {t('events.card.registrationUntil')}{' '}
            {formatDate(new Date(event.registrationDeadline), locale, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to={detailHref}>{t('events.card.manage')}</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-9" aria-label={t('events.card.manage')}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/my-events/${event.id}/edit`}>
                  <Edit className="mr-2 size-4" />
                  {t('actions.edit')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate} disabled={duplicateEvent.isPending}>
                {duplicateEvent.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 size-4" />
                )}
                {t('actions.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
                <Trash2 className="mr-2 size-4" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.dialogs.deleteDescription', { title: event.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvent.isPending}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEvent.mutate(event.id, { onSuccess: () => setShowDelete(false) })}
              disabled={deleteEvent.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteEvent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  )
}

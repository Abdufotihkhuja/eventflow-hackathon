import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Copy, Edit, Layers, Loader2, MapPin, MoreVertical, Trash2, Video } from 'lucide-react'
import { formatDate, getCityLabel } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { MEDIA_BASE_URL } from '@api/config'
import {
  EventFormat,
  getEventStatusLabel,
  type Event,
} from '@entities/event'
import { useDeleteEvent, useDuplicateEvent } from '@features/events/api'
import { getBannerTemplateGradient, isBannerTemplate } from '@features/events/lib/banner-templates'
import { cn } from '@shared/lib/cn'
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

function RowCover({ event }: { event: Event }) {
  if (event.coverImage && isBannerTemplate(event.coverImage)) {
    return <div className={cn('size-full', getBannerTemplateGradient(event.coverImage) ?? 'bg-muted')} />
  }
  if (event.coverImage) {
    return <img src={getMediaUrl(event.coverImage)} alt="" className="size-full object-cover" loading="lazy" />
  }
  const Icon = event.format === EventFormat.ONLINE ? Video : event.format === EventFormat.HYBRID ? Layers : MapPin
  return (
    <div className="flex size-full items-center justify-center bg-muted text-muted-foreground/50">
      <Icon className="size-4" aria-hidden="true" />
    </div>
  )
}

export function EventRow({ event }: { event: Event }) {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const deleteEvent = useDeleteEvent()
  const duplicateEvent = useDuplicateEvent()

  const detailHref = `/my-events/${event.id}`
  const sold = event._count?.registrations ?? 0
  const cap = event.maxParticipants ?? 0
  const pct = cap ? Math.min(100, Math.round((sold / cap) * 100)) : 0
  const barTone = pct >= 90 ? 'bg-primary' : pct >= 75 ? 'bg-warning' : 'bg-foreground'
  const dateStr = event.startDate
    ? formatDate(new Date(event.startDate), locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const cityLabel = event.city ? getCityLabel(t)(event.city) : ''
  const meta = [dateStr, [event.venue, cityLabel].filter(Boolean).join(', ')].filter(Boolean).join(' · ')

  const handleDuplicate = () =>
    duplicateEvent.mutate(event, { onSuccess: dup => navigate(`/my-events/${dup.id}/edit`) })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_130px_180px_44px] sm:gap-4">
      {/* Event */}
      <Link to={detailHref} className="flex min-w-0 items-center gap-3">
        <span className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border">
          <RowCover event={event} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-[-0.005em] text-foreground">
              {event.title}
            </span>
            <span className="sm:hidden">
              <StatusPill tone={statusPillTone(event.status)} size="sm">
                {getEventStatusLabel(t)(event.status)}
              </StatusPill>
            </span>
          </span>
          {meta && <span className="mt-0.5 block truncate font-mono text-[12px] text-muted-foreground">{meta}</span>}
        </span>
      </Link>

      {/* Status (desktop column) */}
      <div className="hidden sm:block">
        <StatusPill tone={statusPillTone(event.status)} size="sm">
          {getEventStatusLabel(t)(event.status)}
        </StatusPill>
      </div>

      {/* Registrations */}
      <div className="hidden sm:block">
        <div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[12px]">
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

      {/* Actions */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t('events.card.manage')}>
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
    </div>
  )
}

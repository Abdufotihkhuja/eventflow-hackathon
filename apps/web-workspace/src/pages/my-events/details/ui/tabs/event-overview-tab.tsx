import { Link } from 'react-router-dom'

import { AlertCircle, ImagePlus, MapPin, Video } from 'lucide-react'
import { formatDate, getCityLabel } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { MEDIA_BASE_URL } from '@api/config'
import {
  AccessType,
  EventFormat,
  EventStatus,
  resolveLocalizedField,
  resolveLocalizedRichField,
  type Event,
} from '@entities/event'
import { useUpdateEvent, EventInvitationsCard, PrivateInvitationsCard } from '@features/events'
import { getBannerTemplateGradient, isBannerTemplate } from '@features/events/lib/banner-templates'
import { EventLocationMap } from '@features/events/ui/event-location-map'
import { cn } from '@shared/lib/cn'
import {
  Button,
  RichTextContent,
  StatTile,
  StatusPill,
  Switch,
} from '@shared/ui'

const MS_PER_DAY = 86_400_000

const getMediaUrl = (url: string) => {
  if (!url || url.startsWith('http') || url.startsWith('blob:')) return url
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function CoverBanner({ event }: { event: Event }) {
  const { t } = useI18n()
  const editHref = `/my-events/${event.id}/edit`
  const hasCover = Boolean(event.coverImage)

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <div className="aspect-[16/5] w-full">
        {event.coverImage && isBannerTemplate(event.coverImage) ? (
          <div className={cn('size-full', getBannerTemplateGradient(event.coverImage) ?? 'bg-muted')} />
        ) : event.coverImage ? (
          <img src={getMediaUrl(event.coverImage)} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted">
            <img src="/icon.svg" alt="" className="size-10 opacity-30" />
            <span className="text-xs text-muted-foreground">{t('events.overview.coverEmpty')}</span>
          </div>
        )}
      </div>
      <div className="absolute right-3 top-3">
        <Button asChild variant="outline" size="sm" className="bg-background/90 backdrop-blur">
          <Link to={editHref} className="gap-1.5">
            <ImagePlus className="size-4" />
            {hasCover ? t('events.overview.replaceCover') : t('events.overview.addCover')}
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function EventOverviewTab({ event }: { event: Event }) {
  const { locale, t } = useI18n()
  const updateEvent = useUpdateEvent(event.id)

  const sold = event._count?.registrations ?? 0
  const cap = event.maxParticipants ?? 0
  const pct = cap ? Math.min(100, Math.round((sold / cap) * 100)) : 0
  const spotsLeft = cap ? Math.max(0, cap - sold) : 0
  const views = event.viewsCount ?? 0
  const conversion = views > 0 ? Math.round((sold / views) * 100) : null

  const start = new Date(event.startDate)
  const days = Math.ceil((start.getTime() - Date.now()) / MS_PER_DAY)
  const isPublished = event.status === EventStatus.PUBLISHED
  const countdown =
    isPublished && days > 0
      ? t('events.overview.countdownDays', { count: days })
      : isPublished && days === 0
        ? t('events.overview.countdownToday')
        : null
  const startShort = formatDate(start, locale, { day: 'numeric', month: 'short', year: 'numeric' })

  const registrationOpen = event.registrationOpen ?? true
  const deadlinePassed =
    registrationOpen &&
    event.registrationDeadline != null &&
    new Date(event.registrationDeadline).getTime() < Date.now()

  const handleRegistrationToggle = (next: boolean) => {
    updateEvent.mutate(
      { registrationOpen: next },
      {
        onSuccess: () =>
          toast.success(
            next
              ? t('events.details.registrationOpenedToast')
              : t('events.details.registrationClosedToast'),
          ),
        onError: () => toast.error(t('events.form.updateError')),
      },
    )
  }

  const venue = resolveLocalizedField(event.translations, 'venue', locale, event.venue)
  const address = resolveLocalizedField(event.translations, 'address', locale, event.address)
  const city = event.city ? getCityLabel(t)(event.city) : ''
  const isOnline = event.format === EventFormat.ONLINE
  const hasVenue = Boolean(venue || address || city || event.onlineUrl)
  const hasSide = hasVenue || event.registrationDeadline != null

  const localizedShort = resolveLocalizedField(
    event.translations,
    'shortDescription',
    locale,
    event.shortDescription,
  )
  const fallbackBlocks = Array.isArray(event.description) ? (event.description as unknown[]) : null
  const localizedBlocks = resolveLocalizedRichField<unknown>(
    event.richTranslations,
    'description',
    locale,
    fallbackBlocks,
  )
  const hasRich = Boolean(localizedBlocks && localizedBlocks.length > 0)
  const hasPlainDesc = typeof event.description === 'string' && event.description.length > 0

  return (
    <div className="space-y-6">
      <CoverBanner event={event} />

      {/* Real metrics only — registrations, public views, conversion, countdown */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={t('events.overview.registrationsStat')}
          info={t('events.overview.registrationsInfo')}
          value={cap ? `${sold.toLocaleString()} / ${cap.toLocaleString()}` : sold.toLocaleString()}
          hint={cap ? `${pct}% · ${t('events.overview.spotsLeft', { count: spotsLeft })}` : undefined}
          tone={cap && pct >= 90 ? 'warning' : 'default'}
        />
        <StatTile
          label={t('events.overview.viewsStat')}
          info={t('events.overview.viewsInfo')}
          value={views.toLocaleString()}
        />
        {conversion != null && (
          <StatTile
            label={t('events.overview.conversionStat')}
            info={t('events.overview.conversionInfo')}
            value={`${conversion}%`}
          />
        )}
        {countdown && (
          <StatTile label={t('events.overview.countdownStat')} value={countdown} hint={startShort} />
        )}
      </div>

      <div className={cn('grid gap-6', hasSide && 'lg:grid-cols-3')}>
        {/* Main column */}
        <div className={cn('space-y-6', hasSide && 'lg:col-span-2')}>
          {/* Registration control — compact, inline (no banner) */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <StatusPill tone={registrationOpen ? 'live' : 'paused'} size="sm">
                {registrationOpen
                  ? t('events.details.registrationOpenBadge')
                  : t('events.details.registrationClosedBadge')}
              </StatusPill>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t('events.details.registrationToggleLabel')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {registrationOpen
                    ? t('events.details.registrationToggleOnDescription')
                    : t('events.details.registrationToggleOffDescription')}
                  {deadlinePassed && (
                    <span className="ml-1.5 font-medium text-warning">
                      {t('events.details.registrationDeadlinePassedNote')}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Switch
              checked={registrationOpen}
              disabled={updateEvent.isPending}
              onCheckedChange={handleRegistrationToggle}
              aria-label={t('events.details.registrationToggleLabel')}
            />
          </div>

          {event.accessType === AccessType.INVITE_ONLY && (
            <EventInvitationsCard
              eventId={event.id}
              eventTitle={resolveLocalizedField(event.translations, 'title', locale, event.title)}
            />
          )}

          {event.accessType === AccessType.PRIVATE && (
            <PrivateInvitationsCard
              eventId={event.id}
              eventTitle={resolveLocalizedField(event.translations, 'title', locale, event.title)}
              isPublished={isPublished}
            />
          )}

          {/* Description */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('events.overview.descriptionTitle')}
            </h3>
            {localizedShort && (
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{localizedShort}</p>
            )}
            {hasRich ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <RichTextContent content={localizedBlocks as unknown[]} />
              </div>
            ) : hasPlainDesc ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.description as string}</p>
            ) : (
              !localizedShort && (
                <p className="text-sm italic text-muted-foreground">
                  {t('events.overview.descriptionEmpty')}
                </p>
              )
            )}
          </div>

          {/* Categories */}
          {event.categories && event.categories.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t('events.form.categoriesLabel')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {event.categories.map(category => (
                  <span
                    key={category.id}
                    className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side column */}
        {hasSide && (
        <div className="space-y-6">
          {hasVenue && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                {isOnline ? (
                  <Video className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
                {t('events.overview.locationTitle')}
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                {venue && <p className="font-medium text-foreground">{venue}</p>}
                {address && <p>{address}</p>}
                {city && <p>{city}</p>}
                {isOnline && event.onlineUrl && (
                  <a
                    href={event.onlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block break-all text-primary hover:underline"
                  >
                    {t('events.overview.meetingLink')}
                  </a>
                )}
              </div>
              {event.latitude != null && event.longitude != null && (
                <div className="mt-3">
                  <EventLocationMap
                    latitude={event.latitude}
                    longitude={event.longitude}
                    caption={venue || address || undefined}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {event.registrationDeadline && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertCircle className="size-4 text-warning" aria-hidden="true" />
                {t('events.overview.registrationDeadlineTitle')}
              </h3>
              <p className="text-sm font-medium text-foreground">
                {formatDate(new Date(event.registrationDeadline), locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('events.overview.registrationDeadlineDescription')}
              </p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

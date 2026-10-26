import { type Control, useWatch } from 'react-hook-form'
import { CalendarDays, MapPin, Video } from 'lucide-react'
import { formatDate, getCityLabel } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { MEDIA_BASE_URL } from '@api/config'
import { getCurrencyLabel } from '@entities/event'
import { useCurrentUser, isOrganizationUser, isMemberUser } from '@features/profile'
import { BANNER_TEMPLATE_GRADIENTS, type BannerTemplate } from '@features/events/lib/banner-templates'
import { cn } from '@shared/lib/cn'

function mediaUrl(url?: string) {
  if (!url) return undefined
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

type EventLivePreviewProps = {
  control: Control<any>
}

/**
 * Public-page preview driven entirely by live form state. Shows only real
 * values the organizer has entered; missing required fields render honest
 * placeholders rather than fabricated data. The organization name is the real
 * signed-in org — never a sample.
 */
export function EventLivePreview({ control }: EventLivePreviewProps) {
  const { t, locale } = useI18n()
  const cityLabel = getCityLabel(t)
  const currencyLabel = getCurrencyLabel(t)

  const { data: currentUser } = useCurrentUser()
  const orgName = isOrganizationUser(currentUser)
    ? currentUser.data.organizationName
    : isMemberUser(currentUser)
      ? currentUser.data.organization?.name
      : undefined

  const title = useWatch({ control, name: 'title' }) as string | undefined
  const slug = useWatch({ control, name: 'slug' }) as string | undefined
  const shortDescription = useWatch({ control, name: 'shortDescription' }) as string | undefined
  const eventMedia = useWatch({ control, name: 'eventMedia' }) as
    | { type: 'file' | 'template'; url?: string; template?: BannerTemplate }
    | undefined
  const startDate = useWatch({ control, name: 'startDate' }) as string | undefined
  const type = useWatch({ control, name: 'type' }) as string | undefined
  const price = useWatch({ control, name: 'price' }) as number | string | undefined
  const currency = useWatch({ control, name: 'currency' }) as string | undefined
  const format = useWatch({ control, name: 'format' }) as string | undefined
  const venue = useWatch({ control, name: 'venue' }) as string | undefined
  const city = useWatch({ control, name: 'city' }) as string | undefined
  const onlineUrl = useWatch({ control, name: 'onlineUrl' }) as string | undefined

  const dateValid = Boolean(startDate) && !Number.isNaN(Date.parse(startDate as string))
  const start = dateValid ? new Date(startDate as string) : null

  const priceNum = price === '' || price == null ? null : Number(price)
  const isPaid = type === 'PAID'
  const showPrice = isPaid && priceNum != null && !Number.isNaN(priceNum) && priceNum > 0

  const isOnline = format === 'ONLINE'
  const locationText = isOnline
    ? onlineUrl
      ? t('events.studio.preview.onlineEvent')
      : null
    : venue
      ? `${venue}${city ? ` · ${cityLabel(city)}` : ''}`
      : null

  const urlSlug = (slug || '').trim()

  const templateGradient =
    eventMedia?.type === 'template' && eventMedia.template
      ? BANNER_TEMPLATE_GRADIENTS[eventMedia.template]
      : null
  const fileCover = eventMedia?.type === 'file' ? mediaUrl(eventMedia.url) : undefined

  return (
    <div className="space-y-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t('events.studio.preview.label')}
      </p>

      {/* Public page card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2">
          <span className="size-2.5 rounded-full bg-border" aria-hidden />
          <span className="size-2.5 rounded-full bg-border" aria-hidden />
          <span className="size-2.5 rounded-full bg-border" aria-hidden />
          <div className="ml-2 flex-1 truncate rounded-md bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            eventflow.uz/{urlSlug || <span className="opacity-50">{t('events.studio.preview.slugPlaceholder')}</span>}
          </div>
        </div>

        {/* Cover */}
        <div className="relative h-40 w-full">
          {fileCover ? (
            <img src={fileCover} alt="" className="size-full object-cover" />
          ) : templateGradient ? (
            <div className={cn('size-full', templateGradient)} />
          ) : (
            <div className="flex size-full items-center justify-center bg-secondary text-xs text-muted-foreground">
              {t('events.studio.preview.coverPlaceholder')}
            </div>
          )}
          {orgName && (
            <span className="absolute left-3 top-3 rounded-md border border-white/30 bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {orgName}
            </span>
          )}
        </div>

        <div className="space-y-4 p-4">
          <h3 className={cn('text-[17px] font-bold leading-tight tracking-[-0.01em]', !title && 'text-muted-foreground')}>
            {title || t('events.studio.preview.titlePlaceholder')}
          </h3>

          {/* Date + location */}
          <div className="flex items-start gap-3">
            {start ? (
              <div className="grid shrink-0 place-items-center rounded-md border border-border px-2.5 py-1 text-center">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {formatDate(start, locale, { month: 'short' })}
                </span>
                <span className="text-base font-bold leading-none tabular-nums">
                  {formatDate(start, locale, { day: 'numeric' })}
                </span>
              </div>
            ) : null}
            <div className="min-w-0 space-y-1 text-sm">
              <div className="flex items-center gap-1.5 text-foreground">
                <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {start ? (
                  <span>
                    {formatDate(start, locale, { weekday: 'long' })} ·{' '}
                    {formatDate(start, locale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t('events.studio.preview.datePlaceholder')}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {isOnline ? (
                  <Video className="size-3.5 shrink-0" aria-hidden />
                ) : (
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                )}
                <span className={cn(!locationText && 'opacity-70')}>
                  {locationText || t('events.studio.preview.locationPlaceholder')}
                </span>
              </div>
            </div>
          </div>

          {shortDescription ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{shortDescription}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground/70">{t('events.studio.preview.summaryPlaceholder')}</p>
          )}

          {/* Registration block (non-interactive preview of the public CTA) */}
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {isPaid ? t('events.studio.preview.from') : t('events.studio.preview.price')}
              </span>
              <span className="text-base font-bold tabular-nums">
                {isPaid
                  ? showPrice
                    ? `${priceNum!.toLocaleString()} ${currencyLabel(currency || 'UZS')}`
                    : '—'
                  : t('events.studio.preview.free')}
              </span>
            </div>
            <div
              className="mt-2 grid place-items-center rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground opacity-90"
              aria-hidden
            >
              {t('events.studio.preview.cta')}
            </div>
          </div>
        </div>
      </div>

      {/* SEO preview — derived only from real title / summary / slug */}
      <div className="space-y-1.5 rounded-xl border border-border bg-card p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('events.studio.preview.seoLabel')}
        </p>
        <p className="truncate text-[15px] text-[#1a0dab] dark:text-[#8ab4f8]">
          {(title || t('events.studio.preview.titlePlaceholder')) + ' — Eventflow'}
        </p>
        <p className="truncate font-mono text-xs text-[#006621] dark:text-[#3f9142]">
          eventflow.uz/{urlSlug || t('events.studio.preview.slugPlaceholder')}
        </p>
        <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
          {shortDescription || t('events.studio.preview.seoSummaryPlaceholder')}
        </p>
      </div>
    </div>
  )
}

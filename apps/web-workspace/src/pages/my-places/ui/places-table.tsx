import { Link } from 'react-router-dom'
import { Archive, Eye, Loader2, MapPin, MoreVertical, Pencil, Send, Trash2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { Place, PlaceStatus } from '@api/services'
import { getPlaceCoverUrl, getPlaceMinPrice, getPlaceStatusLabel } from '@features/places'
import { formatCurrency } from '@shared/lib'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

const GRID =
  'grid grid-cols-[minmax(0,1.6fr)_104px_minmax(0,1fr)_88px_120px_44px] items-center gap-4'

type PlacesTableProps = {
  places: Place[]
  busy: boolean
  onEdit: (id: string) => void
  onPublish: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (place: { id: string; title: string }) => void
}

export function PlacesTable({ places, busy, onEdit, onPublish, onArchive, onDelete }: PlacesTableProps) {
  const t = useT()
  const statusLabel = getPlaceStatusLabel(t)

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[820px]">
        <div
          className={`${GRID} border-b border-border bg-secondary/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}
        >
          <span>{t('workspace.places.list.colVenue')}</span>
          <span>{t('workspace.places.list.colStatus')}</span>
          <span>{t('workspace.places.list.colAddress')}</span>
          <span>{t('workspace.places.list.colCapacity')}</span>
          <span>{t('workspace.places.list.colPrice')}</span>
          <span className="sr-only">{t('actions.open')}</span>
        </div>

        {places.map(place => {
          const status = (place.status ?? 'DRAFT') as PlaceStatus
          const cover = getMediaUrl(getPlaceCoverUrl(place))
          const minPrice = getPlaceMinPrice(place)
          const isPublished = status === 'PUBLISHED'

          return (
            <div key={place.id} className={`${GRID} border-b border-border px-5 py-3 last:border-b-0`}>
              {/* Venue */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {cover ? (
                    <img src={cover} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <MapPin className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/my-places/${place.id}`}
                    className="block truncate text-sm font-medium text-foreground hover:text-primary"
                  >
                    {place.title}
                  </Link>
                  {place.city && (
                    <div className="truncate text-xs text-muted-foreground">{place.city}</div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <StatusPill tone={statusPillTone(status)} size="sm">
                  {statusLabel(status)}
                </StatusPill>
              </div>

              {/* Address */}
              <div className="truncate text-[13px] text-muted-foreground">{place.address}</div>

              {/* Capacity */}
              <div className="text-[13px] tabular-nums text-foreground">
                {place.capacity != null ? place.capacity : '—'}
              </div>

              {/* Price */}
              <div className="text-[13px] tabular-nums text-foreground">
                {minPrice
                  ? `${formatCurrency(minPrice.amount, 'ru-RU', place.currency)}${minPrice.suffix}`
                  : '—'}
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={t('actions.open')}>
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MoreVertical className="size-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(place.id)}>
                      <Pencil className="mr-2 size-4" />
                      {t('actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/places/${place.slug}`}>
                        <Eye className="mr-2 size-4" />
                        {t('actions.open')}
                      </Link>
                    </DropdownMenuItem>
                    {isPublished ? (
                      <DropdownMenuItem onClick={() => onArchive(place.id)} disabled={busy}>
                        <Archive className="mr-2 size-4" />
                        {t('workspace.places.editor.archive')}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onPublish(place.id)} disabled={busy}>
                        <Send className="mr-2 size-4" />
                        {t('workspace.places.editor.publish')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete({ id: place.id, title: place.title })}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      {t('actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import * as React from 'react'

import { MapPin } from 'lucide-react'

import { useYandexMaps } from '../../lib/use-yandex-maps'
import { cn } from '@shared/lib/cn'

export type EventLocationMapProps = {
  latitude: number
  longitude: number
  /** Подпись в балуне (venue или address) */
  caption?: string
  className?: string
  /** Высота контейнера карты */
  height?: string | number
}

const DEFAULT_HEIGHT = 280

export function EventLocationMap({
  latitude,
  longitude,
  caption,
  className,
  height = DEFAULT_HEIGHT,
}: EventLocationMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<ymaps.Map | null>(null)
  const { isReady, error } = useYandexMaps()

  React.useEffect(() => {
    if (!isReady || !containerRef.current || !window.ymaps) return

    const center: [number, number] = [latitude, longitude]
    const map = new window.ymaps.Map(containerRef.current, {
      center,
      zoom: 15,
      controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
    })

    const placemark = new window.ymaps.Placemark(
      center,
      {
        balloonContent: caption ?? [latitude, longitude].join(', '),
        iconContent: caption ?? '',
      },
      {
        preset: 'islands#redIcon',
      }
    )
    map.geoObjects.add(placemark)
    mapRef.current = map

    return () => {
      map.destroy()
      mapRef.current = null
    }
  }, [isReady, latitude, longitude, caption])

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground',
          className
        )}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <span className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          Карта недоступна
        </span>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-border bg-muted/20 animate-pulse',
          className
        )}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <span className="text-sm text-muted-foreground">Загрузка карты…</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden rounded-lg border border-border', className)}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  )
}

import * as React from 'react'

import { Loader2, MapPin, Search } from 'lucide-react'

import { useYandexMaps } from '../../lib/use-yandex-maps'
import { cn } from '@shared/lib/cn'
import { Button, Input } from '@shared/ui'

export type LocationPickerValue = {
  latitude?: number | null
  longitude?: number | null
  placeId?: string | null
}

export type LocationPickerChange = {
  latitude: number
  longitude: number
  placeId?: string
  /** Название площадки / места (POI) */
  venue?: string
  address?: string
  city?: string
}

type EventLocationPickerProps = {
  value: LocationPickerValue
  onChange: (change: LocationPickerChange) => void
  className?: string
  /** Высота карты */
  mapHeight?: number
}

const DEFAULT_CENTER: [number, number] = [41.311151, 69.279737] // Ташкент
const MAP_HEIGHT = 320

/** Нормализует координаты в [широта, долгота]. Yandex иногда отдаёт [lat,lng], GeoJSON — [lng,lat]. */
function normalizeCoords(coords: number[]): [number, number] {
  if (coords.length < 2) return [0, 0]
  const a = coords[0]
  const b = coords[1]
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b]
  if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return [b, a]
  return [a, b]
}

function getAddressFromGeoObject(obj: ymaps.IGeoObject): {
  venue?: string
  address?: string
  city?: string
} {
  try {
    const props = obj.properties
    const get = (key: string) => props.get(key) as string | undefined
    const meta = props.get('metaDataProperty') as Record<string, unknown> | undefined
    const geoMeta = meta?.GeocoderMetaData as
      | {
          text?: string
          name?: string
          Address?: { Components?: { kind: string; name: string }[] }
        }
      | undefined

    const venue = (get('name') || geoMeta?.name)?.trim() || undefined
    const address =
      (geoMeta?.text || get('description') || get('balloonContent') || get('text'))?.trim() ||
      undefined
    let city: string | undefined
    const components = geoMeta?.Address?.Components
    if (Array.isArray(components)) {
      const locality = components.find(
        c => c.kind === 'locality' || c.kind === 'district' || c.kind === 'area'
      )
      city = locality?.name?.trim()
    }
    return { venue, address, city }
  } catch {
    return {}
  }
}

export function EventLocationPicker({
  value,
  onChange,
  className,
  mapHeight = MAP_HEIGHT,
}: EventLocationPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<ymaps.Map | null>(null)
  const placemarkRef = React.useRef<ymaps.Placemark | null>(null)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)
  const { isReady, error } = useYandexMaps()

  const center: [number, number] =
    value.latitude != null && value.longitude != null
      ? [value.latitude, value.longitude]
      : DEFAULT_CENTER

  const updatePlacemark = React.useCallback(
    (map: ymaps.Map, coords: [number, number], address?: string) => {
      if (placemarkRef.current) {
        map.geoObjects.remove(placemarkRef.current)
      }
      const pm = new window.ymaps.Placemark(
        coords,
        { balloonContent: address ?? coords.join(', ') },
        { preset: 'islands#redIcon', draggable: true }
      )
      pm.events.add('dragend', () => {
        const raw = pm.geometry.getCoordinates() as number[]
        const [lat, lng] = normalizeCoords(Array.isArray(raw) ? raw : [])
        window.ymaps
          .geocode([lat, lng], { results: 1 })
          .then(res => {
            if (res.geoObjects.getLength() > 0) {
              const obj = res.geoObjects.get(0)
              const data = getAddressFromGeoObject(obj)
              onChangeRef.current({
                latitude: lat,
                longitude: lng,
                venue: data.venue,
                address: data.address,
                city: data.city,
              })
            } else {
              onChangeRef.current({ latitude: lat, longitude: lng })
            }
          })
          .catch(() => onChangeRef.current({ latitude: lat, longitude: lng }))
      })
      map.geoObjects.add(pm)
      placemarkRef.current = pm
    },
    []
  )

  const selectLocation = React.useCallback(
    (map: ymaps.Map, coords: [number, number]) => {
      const [lat, lng] = coords
      setSearchError(null)
      window.ymaps
        .geocode([lat, lng], { results: 1 })
        .then(res => {
          if (res.geoObjects.getLength() > 0) {
            const obj = res.geoObjects.get(0)
            const data = getAddressFromGeoObject(obj)
            updatePlacemark(map, [lat, lng], data.address)
            onChangeRef.current({
              latitude: lat,
              longitude: lng,
              venue: data.venue,
              address: data.address,
              city: data.city,
            })
          } else {
            updatePlacemark(map, [lat, lng])
            onChangeRef.current({ latitude: lat, longitude: lng })
          }
        })
        .catch(() => {
          updatePlacemark(map, [lat, lng])
          onChangeRef.current({ latitude: lat, longitude: lng })
          setSearchError(
            'Координаты сохранены, но адрес не подставился. Проверьте ключ API: в кабинете Yandex должен быть включён Геокодер.'
          )
        })
    },
    [updatePlacemark]
  )

  React.useEffect(() => {
    if (!isReady || !containerRef.current || !window.ymaps) return

    const map = new window.ymaps.Map(
      containerRef.current,
      {
        center,
        zoom: value.latitude != null ? 15 : 11,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
      },
      {
        autoFitToViewport: 'always',
        openBalloonOnClick: false,
        // Делает Yandex-POI/организации некликабельными: иначе клик по
        // зданию открывает балун организации вместо выбора точки, и место,
        // которого нет в Яндексе, выбрать невозможно. Теперь любой клик
        // (по зданию или пустому месту) ставит метку и сохраняет координаты.
        yandexMapDisablePoiInteractivity: true,
        suppressMapOpenBlock: true,
      }
    )

    map.events.add('click', (e: ymaps.IEvent) => {
      const domEvent = e.get('domEvent') as
        | { preventDefault?: () => void; stopPropagation?: () => void }
        | undefined
      domEvent?.preventDefault?.()
      domEvent?.stopPropagation?.()
      const raw = e.get('coords') as number[] | undefined
      if (!raw || raw.length < 2) return
      const [lat, lng] = normalizeCoords(raw)
      selectLocation(map, [lat, lng])
    })

    const fitToViewport = () => map.container.fitToViewport()
    window.requestAnimationFrame(fitToViewport)
    const resizeObserver = new ResizeObserver(fitToViewport)
    resizeObserver.observe(containerRef.current)

    if (value.latitude != null && value.longitude != null) {
      updatePlacemark(map, [value.latitude, value.longitude], undefined)
    }

    mapRef.current = map
    return () => {
      resizeObserver.disconnect()
      map.destroy()
      mapRef.current = null
      placemarkRef.current = null
    }
  }, [isReady]) // eslint-disable-line react-hooks/exhaustive-deps -- init map once

  React.useEffect(() => {
    if (!mapRef.current || value.latitude == null || value.longitude == null) return
    mapRef.current.setCenter([value.latitude, value.longitude], 15)
    updatePlacemark(mapRef.current, [value.latitude, value.longitude])
  }, [value.latitude, value.longitude, updatePlacemark])

  const handleSearch = React.useCallback(() => {
    const q = searchQuery.trim()
    if (!q || !window.ymaps) return
    setSearching(true)
    setSearchError(null)
    // ymaps.geocode возвращает thenable без .finally() — оборачиваем в Promise
    Promise.resolve(window.ymaps.geocode(q, { results: 1 }))
      .then(res => {
        try {
          const collection = res?.geoObjects
          if (!collection || typeof collection.getLength !== 'function') {
            setSearchError('Неожиданный ответ карты. Попробуйте другой запрос.')
            return
          }
          if (collection.getLength() === 0) {
            setSearchError('Ничего не найдено. Уточните запрос или выберите точку на карте.')
            return
          }
          const obj = collection.get(0)
          if (!obj?.geometry?.getCoordinates) {
            setSearchError('Не удалось прочитать координаты из ответа.')
            return
          }
          const raw = obj.geometry.getCoordinates()
          const coordsArr = Array.isArray(raw)
            ? raw
            : typeof raw === 'object' && raw !== null
              ? [
                  Number((raw as { latitude?: number; longitude?: number }).latitude),
                  Number((raw as { latitude?: number; longitude?: number }).longitude),
                ]
              : []
          const [lat, lng] = normalizeCoords(coordsArr.length >= 2 ? coordsArr : [])
          if (lat === 0 && lng === 0) {
            setSearchError('Не удалось прочитать координаты из ответа.')
            return
          }
          const data = getAddressFromGeoObject(obj)
          if (mapRef.current) {
            mapRef.current.setCenter([lat, lng], 15)
            updatePlacemark(mapRef.current, [lat, lng], data.address)
          }
          onChangeRef.current({
            latitude: lat,
            longitude: lng,
            venue: data.venue,
            address: data.address,
            city: data.city,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Ошибка при разборе ответа карты.'
          setSearchError(msg)
          if (import.meta.env.DEV) console.error('Geocode parse error:', err)
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setSearchError(msg || 'Ошибка поиска. Проверьте интернет или попробуйте позже.')
        if (import.meta.env.DEV) console.error('Geocode error:', err)
      })
      .finally(() => setSearching(false))
  }, [searchQuery, updatePlacemark])

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-border bg-muted/30 py-12 text-muted-foreground',
          className
        )}
      >
        <span className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          Карта недоступна. Укажите адрес вручную.
        </span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по адресу (например: Ташкент, ул. Навои 1)"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setSearchError(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                handleSearch()
              }
            }}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="secondary" onClick={handleSearch} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Найти'}
        </Button>
      </div>
      {searchError && (
        <p className="text-sm text-destructive" role="alert">
          {searchError}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Выберите точку на карте или найдите адрес. Координаты подставят адрес и город — их можно
        отредактировать в полях выше.
      </p>
      {!isReady ? (
        <div
          className="flex items-center justify-center rounded-lg border border-border bg-muted/20 animate-pulse"
          style={{ height: mapHeight }}
        >
          <span className="text-sm text-muted-foreground">Загрузка карты…</span>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="overflow-hidden rounded-lg border border-border"
          style={{ height: mapHeight }}
        />
      )}
    </div>
  )
}

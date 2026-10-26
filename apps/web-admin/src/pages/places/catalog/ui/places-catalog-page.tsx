import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'
import { Compass, Loader2, MapPin, Search, SlidersHorizontal, Users } from 'lucide-react'

import type { PlaceCurrency } from '@api/services'
import { getMediaUrl } from '@api/config'
import {
  getPlaceCoverUrl,
  getPlaceMinPrice,
  PLACE_CURRENCY_LABEL_KEYS,
  usePublicPlaces,
} from '@features/places'
import { formatCurrency, getDescriptionText } from '@shared/lib'
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'places.catalog.sortNewest' },
  { value: 'price_asc', labelKey: 'places.catalog.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'places.catalog.sortPriceDesc' },
  { value: 'nearest', labelKey: 'places.catalog.sortNearest' },
] as const

export default function PlacesCatalogPage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('newest')
  const [currency, setCurrency] = useState<PlaceCurrency | 'all'>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({})
  const [locationError, setLocationError] = useState<string | null>(null)

  const deferredSearch = useDeferredValue(search)
  const { data, isLoading, isError, error } = usePublicPlaces({
    page,
    limit: 12,
    search: deferredSearch.trim() || undefined,
    city: city.trim() || undefined,
    sort,
    currency: currency === 'all' ? undefined : currency,
    minPrice: minPrice.trim() ? Number(minPrice) : undefined,
    maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined,
    latitude: coords.latitude,
    longitude: coords.longitude,
    ...(sort === 'nearest' ? { radiusKm: 15 } : {}),
  })

  const places = data?.data ?? []
  const totalPages = data?.totalPages ?? 0

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Геолокация недоступна в этом браузере')
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setSort('nearest')
        setLocationError(null)
        setPage(1)
      },
      () => {
        setLocationError('Не удалось определить вашу геолокацию')
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }

  return (
    <div className="min-h-0 bg-background">
      <div className="space-y-6">
        <section className="rounded-[24px] border border-border bg-card px-6 py-8 sm:px-8">
          <div className="space-y-6">
            <div className="max-w-3xl space-y-3">
              <Badge className="border-0 bg-muted px-3 py-1 text-muted-foreground">
                EventFlow places
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Площадки для мероприятий, которые легко сравнивать и быстро бронировать
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Каталог построен вокруг практичных решений: фото без шума, прозрачная цена, точный
                адрес, вместимость и быстрый переход к заявке.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
                <div className="relative xl:col-span-2">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={event => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                    className="pl-9"
                    placeholder="Поиск по названию или району"
                  />
                </div>
                <Input
                  value={city}
                  onChange={event => {
                    setCity(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Город"
                />
                <Select
                  value={currency}
                  onValueChange={value => {
                    setCurrency(value as PlaceCurrency | 'all')
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Валюта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все валюты</SelectItem>
                    {Object.entries(PLACE_CURRENCY_LABEL_KEYS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort}
                  onValueChange={value => {
                    setSort(value as (typeof SORT_OPTIONS)[number]['value'])
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleUseLocation}>
                  <Compass />
                  Рядом
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={minPrice}
                    onChange={event => {
                      setMinPrice(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Цена от"
                    type="number"
                  />
                  <Input
                    value={maxPrice}
                    onChange={event => {
                      setMaxPrice(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Цена до"
                    type="number"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SlidersHorizontal className="size-4" />
                  {locationError ? locationError : `Найдено площадок: ${data?.total ?? 0}`}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {isLoading && (
            <Card className="flex min-h-72 items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Загружаем каталог...
              </div>
            </Card>
          )}

          {isError && (
            <Card className="border-destructive/30 p-6 text-destructive">
              Не удалось загрузить каталог: {error?.message ?? 'неизвестная ошибка'}
            </Card>
          )}

          {!isLoading && !isError && places.length === 0 && (
            <Card className="p-10 text-center">
              <div className="mx-auto max-w-lg space-y-3">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
                  <MapPin className="size-6 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Площадки пока не найдены</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Попробуйте расширить фильтры или сменить сортировку. Каталог уже подключён к live
                  API и будет пополняться опубликованными площадками.
                </p>
              </div>
            </Card>
          )}

          {!isLoading && !isError && places.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {places.map(place => {
                const cover = getPlaceCoverUrl(place)
                const pricePreview = getPlaceMinPrice(place)
                const hasHourly = (place.pricePerHour ?? 0) > 0
                const hasDaily = (place.pricePerDay ?? 0) > 0
                return (
                <Link
                  key={place.id}
                  to={`/places/${place.slug}`}
                  className="group rounded-[20px] border border-border bg-card p-3 transition-shadow duration-300 hover:shadow-sm"
                >
                  <div className="overflow-hidden rounded-[16px] bg-muted">
                    {cover ? (
                      <img
                        src={getMediaUrl(cover)}
                        alt={place.title}
                        className="aspect-[1.14] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex aspect-[1.14] items-center justify-center text-muted-foreground">
                        Нет фото
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 px-2 pb-2 pt-4">
                    <div className="space-y-2">
                      <div>
                        <h2 className="line-clamp-2 text-xl font-semibold text-foreground">
                          {place.title}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">{place.city || 'Узбекистан'}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {hasHourly && (
                          <Badge className="border-border bg-info-soft text-info-soft-foreground">
                            {formatCurrency(place.pricePerHour!, 'ru-RU', place.currency)}/час
                          </Badge>
                        )}
                        {hasDaily && (
                          <Badge className="border-border bg-warning-soft text-warning-soft-foreground">
                            {formatCurrency(place.pricePerDay!, 'ru-RU', place.currency)}/сутки
                          </Badge>
                        )}
                        {!hasHourly && !hasDaily && pricePreview && (
                          <Badge className="border-border bg-muted text-muted-foreground">
                            {formatCurrency(pricePreview.amount, 'ru-RU', place.currency)}{pricePreview.suffix}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {place.shortDescription || getDescriptionText(place.description ?? null, 150)}
                    </p>

                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground" />
                        <span className="line-clamp-1">{place.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        <span>До {place.capacity ?? '—'} гостей</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Страница {page} из {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(prev => prev - 1)}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

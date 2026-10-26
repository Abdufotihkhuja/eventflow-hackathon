import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, MapPin, Search, Users } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { PlaceCurrency } from '@api/services'
import { getMediaUrl } from '@api/config'
import {
  getPlaceCoverUrl,
  getPlaceCurrencyLabel,
  getPlaceMinPrice,
  usePublicPlaces,
} from '@features/places'
import { formatCurrency, getDescriptionText } from '@shared/lib'
import {
  Badge,
  Button,
  Card,
  CitySelect,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PaginationBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'workspace.places.sort.newest' },
  { value: 'price_asc', labelKey: 'workspace.places.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'workspace.places.sort.priceDesc' },
  { value: 'nearest', labelKey: 'workspace.places.sort.nearest' },
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
  const { data, isLoading, isError, error, refetch } = usePublicPlaces({
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
      setLocationError(t('workspace.places.catalog.geolocationUnavailable'))
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
        setLocationError(t('workspace.places.catalog.geolocationError'))
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('workspace.places.catalog.title')}
        description={t('workspace.places.catalog.description')}
      />

      {/* Filter bar — one flat wrapping row, same rhythm as the events page */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="h-10 pl-9"
            placeholder={t('workspace.places.catalog.searchPlaceholder')}
            aria-label={t('workspace.places.catalog.searchPlaceholder')}
          />
        </div>
        <CitySelect
          value={city || undefined}
          onChange={value => {
            setCity(value)
            setPage(1)
          }}
          placeholder={t('workspace.places.catalog.cityPlaceholder')}
          className="h-10 w-full sm:w-[160px]"
        />
        <Select
          value={currency}
          onValueChange={value => {
            setCurrency(value as PlaceCurrency | 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="h-10 w-full sm:w-[150px]">
            <SelectValue placeholder={t('workspace.places.catalog.currencyPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('workspace.places.catalog.allCurrencies')}</SelectItem>
            {(['RUB', 'USD', 'EUR', 'UZS'] as const).map(value => (
              <SelectItem key={value} value={value}>
                {getPlaceCurrencyLabel(t)(value)}
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
          <SelectTrigger className="h-10 w-full sm:w-[170px]">
            <SelectValue placeholder={t('workspace.places.catalog.sortPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={minPrice}
          onChange={event => {
            setMinPrice(event.target.value)
            setPage(1)
          }}
          placeholder={t('workspace.places.catalog.minPrice')}
          type="number"
          inputMode="numeric"
          className="h-10 w-full sm:w-28"
          aria-label={t('workspace.places.catalog.minPrice')}
        />
        <Input
          value={maxPrice}
          onChange={event => {
            setMaxPrice(event.target.value)
            setPage(1)
          }}
          placeholder={t('workspace.places.catalog.maxPrice')}
          type="number"
          inputMode="numeric"
          className="h-10 w-full sm:w-28"
          aria-label={t('workspace.places.catalog.maxPrice')}
        />
        <Button variant="outline" className="h-10" onClick={handleUseLocation}>
          <Compass className="mr-1.5 size-4" aria-hidden="true" />
          {t('workspace.places.catalog.nearby')}
        </Button>
        {locationError && <span className="text-xs text-destructive">{locationError}</span>}
      </div>

      {isLoading && <LoadingState label={t('workspace.places.catalog.loading')} />}

      {isError && !isLoading && (
        <ErrorState
          title={t('workspace.places.catalog.loadError', {
            message: error?.message ?? t('workspace.places.list.unknownError'),
          })}
          onRetry={() => refetch()}
          retryLabel={t('actions.retry')}
        />
      )}

      {!isLoading && !isError && places.length === 0 && (
        <Card>
          <EmptyState
            icon={MapPin}
            title={t('workspace.places.catalog.emptyTitle')}
            description={t('workspace.places.catalog.emptyDescription')}
          />
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
              <Card
                key={place.id}
                interactive
                className="flex flex-col gap-4 overflow-hidden p-0"
              >
                <Link
                  to={`/places/${place.slug}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <div className="overflow-hidden bg-muted">
                    {cover ? (
                      <img
                        src={getMediaUrl(cover)}
                        alt={place.title}
                        className="aspect-[16/10] w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center text-xs text-muted-foreground">
                        {t('workspace.places.catalog.noPhoto')}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
                  <div className="space-y-1">
                    <h2 className="line-clamp-2 text-base font-semibold tracking-tight">
                      <Link to={`/places/${place.slug}`} className="hover:text-primary">
                        {place.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {place.city || t('workspace.places.catalog.defaultCity')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {hasHourly && (
                      <Badge variant="secondary" className="font-normal">
                        {formatCurrency(place.pricePerHour!, 'ru-RU', place.currency)}
                        {t('workspace.places.catalog.perHour')}
                      </Badge>
                    )}
                    {hasDaily && (
                      <Badge variant="secondary" className="font-normal">
                        {formatCurrency(place.pricePerDay!, 'ru-RU', place.currency)}
                        {t('workspace.places.catalog.perDay')}
                      </Badge>
                    )}
                    {!hasHourly && !hasDaily && pricePreview && (
                      <Badge variant="secondary" className="font-normal">
                        {formatCurrency(pricePreview.amount, 'ru-RU', place.currency)}
                        {pricePreview.suffix}
                      </Badge>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {place.shortDescription || getDescriptionText(place.description ?? null, 150)}
                  </p>

                  <div className="mt-auto space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="line-clamp-1">{place.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {t('workspace.places.list.guestsUpTo', {
                          capacity: place.capacity ?? '—',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!isLoading && !isError && places.length > 0 && (
        <p className="font-mono text-[12px] text-muted-foreground">
          {t('workspace.places.catalog.found', { count: data?.total ?? 0 })}
        </p>
      )}

      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          summary={t('workspace.places.list.pageInfo', { page, total: totalPages })}
          previousLabel={t('actions.back')}
          nextLabel={t('actions.next')}
        />
      )}
    </div>
  )
}

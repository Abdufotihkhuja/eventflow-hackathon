import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLocale, useT } from '@eventflow/i18n/react'
import {
  Archive,
  ArrowRight,
  Building2,
  Eye,
  Globe2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
} from 'lucide-react'

import type { PlaceStatus } from '@api/services'
import { getMediaUrl } from '@api/config'
import { useCurrentUser, isOrganizationUser } from '@features/profile'
import {
  getPlaceCoverUrl,
  getPlaceMinPrice,
  PLACE_STATUS_LABEL_KEYS,
  PLACE_STATUS_STYLES,
  useArchivePlace,
  useDeletePlace,
  useMyPlaces,
  usePublishPlace,
} from '@features/places'
import { cn, formatCurrency, getDescriptionText } from '@shared/lib'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

const STATUS_OPTIONS: Array<{ value: 'all' | PlaceStatus; labelKey: string }> = [
  { value: 'all', labelKey: 'admin.filters.allStatuses' },
  { value: 'DRAFT', labelKey: 'places.status.draft' },
  { value: 'PUBLISHED', labelKey: 'places.status.published' },
  { value: 'ARCHIVED', labelKey: 'places.status.archived' },
]

const panelGhostClass = ''

export default function MyPlacesPage() {
  const t = useT()
  const locale = useLocale()
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | PlaceStatus>('all')
  const [page, setPage] = useState(1)
  const [deletingPlace, setDeletingPlace] = useState<{ id: string; title: string } | null>(null)

  const deferredSearch = useDeferredValue(search)
  const { data, isLoading, isError, error } = useMyPlaces({
    page,
    limit: 9,
    search: deferredSearch.trim() || undefined,
    status: status === 'all' ? undefined : status,
  })

  const publishPlace = usePublishPlace()
  const archivePlace = useArchivePlace()
  const deletePlace = useDeletePlace()

  const organization = isOrganizationUser(currentUser) ? currentUser.data : null
  const places = data?.data ?? []

  const draft = places.filter(place => place.status === 'DRAFT').length
  const published = places.filter(place => place.status === 'PUBLISHED').length
  const archived = places.filter(place => place.status === 'ARCHIVED').length
  const stats = [
    { label: t('admin.batch1.myPlacesPage.s001'), value: data?.total ?? 0 },
    { label: t('admin.batch1.myPlacesPage.s002'), value: published },
    { label: t('admin.batch1.myPlacesPage.s003'), value: draft },
    { label: t('admin.batch1.myPlacesPage.s004'), value: archived },
  ]

  const totalPages = data?.totalPages ?? 0
  const isBusy =
    publishPlace.isPending || archivePlace.isPending || deletePlace.isPending || isLoading

  if (!organization) {
    return (
      <Card className="p-8">
        <h2 className="text-xl font-semibold text-foreground">{t('admin.batch1.myPlacesPage.s005')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('admin.batch1.myPlacesPage.s006')}</p>
      </Card>
    )
  }

  if (!organization.placesFeatureEnabled) {
    return (
      <div className="space-y-6">
        <section className="rounded-[28px] border border-border bg-card p-8">
          <div className="max-w-3xl space-y-4">
            <Badge className="border-0 bg-success-soft px-3 py-1 text-success-soft-foreground">{t('admin.batch1.myPlacesPage.s007')}</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('admin.batch1.myPlacesPage.s008')}</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">{t('admin.batch1.myPlacesPage.s009')}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                variant="outline"
              >
                <Link to="/places">{t('admin.batch1.myPlacesPage.s010')}<ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <Card className="border-dashed p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-success-soft p-3 text-success-soft-foreground">
              <Building2 className="size-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">{t('admin.batch1.myPlacesPage.s011')}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{t('admin.batch1.myPlacesPage.s012')}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-border bg-card px-6 py-8 sm:px-8">
        <div className="space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge className="border-0 bg-muted px-3 py-1 text-muted-foreground">
                {t('admin.batch1.myPlacesPage.workspaceLabel')}
              </Badge>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t('admin.batch1.myPlacesPage.s013')}</h1>
                <p className="text-base leading-7 text-muted-foreground">{t('admin.batch1.myPlacesPage.s014')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/my-places/new')}>
                <Plus />{t('admin.batch1.myPlacesPage.s015')}</Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {stats.map(item => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="text-sm text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={t('admin.batch1.myPlacesPage.s016')}
              className="pl-9"
            />
          </div>

          <Select
            value={status}
            onValueChange={value => {
              setStatus(value as 'all' | PlaceStatus)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full lg:w-[220px]">
              <SelectValue placeholder={t('admin.batch1.myPlacesPage.s017')} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading && (
        <Card className="flex min-h-72 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />{t('admin.batch1.myPlacesPage.s018')}</div>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/30 p-6 text-destructive">{t('admin.batch1.myPlacesPage.s019')}{error?.message ?? t('admin.batch1.myPlacesPage.s020')}
        </Card>
      )}

      {!isLoading && !isError && places.length === 0 && (
        <Card className="p-10 text-center">
          <div className="mx-auto max-w-xl space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
              <MapPin className="size-6 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">{t('admin.batch1.myPlacesPage.s021')}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{t('admin.batch1.myPlacesPage.s022')}</p>

            <div className="mx-auto flex max-w-md flex-wrap justify-center gap-3 pt-2">
              <Button
                onClick={() => navigate('/my-places/new')}
                className="mt-2"
              >
                <Plus />{t('admin.batch1.myPlacesPage.s023')}</Button>

              <Button asChild variant="outline" className={cn('mt-2', panelGhostClass)}>
                <Link to="/places">
                  <Globe2 />{t('admin.batch1.myPlacesPage.s024')}</Link>
              </Button>
            </div>

            <div className="grid gap-3 pt-4 text-left sm:grid-cols-3">
              {[
                t('admin.batch1.myPlacesPage.s025'),
                t('admin.batch1.myPlacesPage.s026'),
                t('admin.batch1.myPlacesPage.s027'),
              ].map(item => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !isError && places.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-3">
          {places.map(place => {
            const statusKey = (place.status ?? 'DRAFT') as PlaceStatus
            const cover = getMediaUrl(getPlaceCoverUrl(place))

            return (
              <Card
                key={place.id}
                className="group overflow-hidden transition-shadow duration-300 hover:shadow-sm"
              >
                <div className="relative aspect-[1.28] overflow-hidden bg-muted">
                  {cover ? (
                    <img
                      src={cover}
                      alt={place.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">{t('admin.batch1.myPlacesPage.s028')}</div>
                  )}

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                    <Badge className={cn('border', PLACE_STATUS_STYLES[statusKey])}>
                      {t(PLACE_STATUS_LABEL_KEYS[statusKey])}
                    </Badge>
                    {(() => {
                      const mp = getPlaceMinPrice(place)
                      return mp ? (
                        <Badge className="border-border bg-foreground/80 text-background">{t('admin.batch1.myPlacesPage.s029')}{formatCurrency(mp.amount, locale, place.currency)}{mp.suffix}
                        </Badge>
                      ) : null
                    })()}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-xl font-semibold text-foreground">
                        {place.title}
                      </h3>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {place.shortDescription || getDescriptionText(place.description ?? null, 160)}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="line-clamp-1">{place.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <span>{t('admin.batch1.myPlacesPage.s030')}{place.capacity ?? '—'}{t('admin.batch1.myPlacesPage.s031')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={panelGhostClass}
                      onClick={() => navigate(`/my-places/${place.id}`)}
                    >
                      <Pencil />{t('admin.batch1.myPlacesPage.s032')}</Button>

                    <Button variant="outline" size="sm" className={panelGhostClass} asChild>
                      <Link to={`/places/${place.slug}`}>
                        <Eye />{t('admin.batch1.myPlacesPage.s033')}</Link>
                    </Button>

                    {statusKey === 'PUBLISHED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={panelGhostClass}
                        disabled={isBusy}
                        onClick={() => archivePlace.mutate(place.id)}
                      >
                        <Archive />{t('admin.batch1.myPlacesPage.s034')}</Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => publishPlace.mutate(place.id)}
                      >
                        <Send />{t('admin.batch1.myPlacesPage.s035')}</Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isBusy}
                      onClick={() => setDeletingPlace({ id: place.id, title: place.title })}
                    >
                      <Trash2 />{t('admin.batch1.myPlacesPage.s036')}</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <div className="text-sm text-muted-foreground">{t('admin.batch1.myPlacesPage.s037')}{page}{t('admin.batch1.myPlacesPage.s038')}{totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={panelGhostClass}
              disabled={page <= 1}
              onClick={() => setPage(prev => prev - 1)}
            >{t('admin.batch1.myPlacesPage.s039')}</Button>
            <Button
              variant="outline"
              className={panelGhostClass}
              disabled={page >= totalPages}
              onClick={() => setPage(prev => prev + 1)}
            >{t('admin.batch1.myPlacesPage.s040')}</Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingPlace} onOpenChange={open => !open && setDeletingPlace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.batch1.myPlacesPage.s041')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPlace
                ? t('admin.batch1.myPlacesPage.deleteDescription', {
                    title: deletingPlace.title,
                  })
                : t('admin.batch1.myPlacesPage.s042')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPlace(null)}>{t('admin.batch1.myPlacesPage.s043')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingPlace) return
                deletePlace.mutate(deletingPlace.id)
                setDeletingPlace(null)
              }}
            >{t('admin.batch1.myPlacesPage.s036')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

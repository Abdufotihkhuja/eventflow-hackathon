import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Globe2, MapPin, Plus, Search } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { PlaceStatus } from '@api/services'
import { useCurrentUser, isOrganizationUser } from '@features/profile'
import {
  useArchivePlace,
  useDeletePlace,
  useMyPlaces,
  usePublishPlace,
} from '@features/places'
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
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PageTabs,
  type PageTabItem,
} from '@shared/ui'

import { PlacesTable } from './places-table'

type StatusTab = 'all' | PlaceStatus

export default function MyPlacesPage() {
  const t = useT()
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()

  const [tab, setTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')
  const [deletingPlace, setDeletingPlace] = useState<{ id: string; title: string } | null>(null)

  const deferredSearch = useDeferredValue(search)
  // Fetch the org's venues once; status tabs, search and counts run client-side
  // so the tab counts are real. 50 is the API's max page size for /places/my.
  const { data, isLoading, isError, error, refetch } = useMyPlaces({ page: 1, limit: 50 })

  const publishPlace = usePublishPlace()
  const archivePlace = useArchivePlace()
  const deletePlace = useDeletePlace()

  const organization = isOrganizationUser(currentUser) ? currentUser.data : null
  const places = useMemo(() => data?.data ?? [], [data])

  const counts = useMemo(
    () => ({
      all: places.length,
      PUBLISHED: places.filter(p => p.status === 'PUBLISHED').length,
      DRAFT: places.filter(p => p.status === 'DRAFT').length,
      ARCHIVED: places.filter(p => p.status === 'ARCHIVED').length,
    }),
    [places]
  )

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return places.filter(place => {
      if (tab !== 'all' && place.status !== tab) return false
      if (q) {
        const haystack = `${place.title} ${place.address} ${place.city ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [places, tab, deferredSearch])

  const isBusy = publishPlace.isPending || archivePlace.isPending || deletePlace.isPending
  const hasFilters = Boolean(search) || tab !== 'all'

  if (!organization) {
    return (
      <PageHeader
        title={t('workspace.places.access.ownerOnlyTitle')}
        description={t('workspace.places.access.ownerOnlyDescription')}
      />
    )
  }

  if (!organization.placesFeatureEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('workspace.places.access.featureDisabledTitle')}
          description={t('workspace.places.access.featureDisabledDescription')}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/places">
                {t('workspace.places.access.openCatalog')}
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          }
        />
        <Card className="flex items-start gap-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Building2 className="size-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t('workspace.places.access.platformSetupTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('workspace.places.access.platformSetupDescription')}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const tabs: PageTabItem<StatusTab>[] = [
    { id: 'all', label: t('workspace.places.statusFilter.all'), count: counts.all },
    { id: 'PUBLISHED', label: t('workspace.places.statusFilter.published'), count: counts.PUBLISHED },
    { id: 'DRAFT', label: t('workspace.places.statusFilter.draft'), count: counts.DRAFT },
    { id: 'ARCHIVED', label: t('workspace.places.statusFilter.archived'), count: counts.ARCHIVED },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${t('users.page.kicker')} · ${organization.organizationName}`}
        title={t('workspace.places.list.title')}
        description={t('workspace.places.list.description')}
        actions={
          <Button onClick={() => navigate('/my-places/new')} size="sm">
            <Plus className="mr-1.5 size-4" />
            {t('workspace.places.list.add')}
          </Button>
        }
        bottom={<PageTabs items={tabs} active={tab} onChange={setTab} />}
      />

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={t('workspace.places.list.searchPlaceholder')}
          className="h-10 pl-9"
          aria-label={t('workspace.places.list.searchPlaceholder')}
        />
      </div>

      {isLoading && <LoadingState label={t('workspace.places.list.loading')} />}

      {isError && !isLoading && (
        <ErrorState
          title={t('workspace.places.list.loadError', {
            message: error?.message ?? t('workspace.places.list.unknownError'),
          })}
          onRetry={() => refetch()}
          retryLabel={t('actions.retry')}
        />
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <Card>
          <EmptyState
            icon={MapPin}
            title={t('workspace.places.list.emptyTitle')}
            description={
              hasFilters
                ? t('workspace.places.list.tryChangingFilters')
                : t('workspace.places.list.emptyDescription')
            }
            action={
              hasFilters
                ? undefined
                : {
                    label: t('workspace.places.list.createFirst'),
                    onClick: () => navigate('/my-places/new'),
                  }
            }
            secondaryAction={
              hasFilters
                ? undefined
                : {
                    label: t('workspace.places.list.viewCatalog'),
                    asChild: true,
                    variant: 'outline',
                    children: (
                      <Link to="/places">
                        <Globe2 className="mr-1.5 size-4" />
                        {t('workspace.places.list.viewCatalog')}
                      </Link>
                    ),
                  }
            }
          />
        </Card>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-3">
          <PlacesTable
            places={filtered}
            busy={isBusy}
            onEdit={id => navigate(`/my-places/${id}`)}
            onPublish={id => publishPlace.mutate(id)}
            onArchive={id => archivePlace.mutate(id)}
            onDelete={setDeletingPlace}
          />
          <p className="font-mono text-[12px] text-muted-foreground">
            {t('workspace.places.list.showingCount', {
              shown: filtered.length,
              total: counts.all,
            })}
          </p>
        </div>
      )}

      <AlertDialog open={!!deletingPlace} onOpenChange={open => !open && setDeletingPlace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workspace.places.list.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPlace
                ? t('workspace.places.list.deleteDescription', { title: deletingPlace.title })
                : t('workspace.places.list.deleteFallbackDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPlace(null)}>
              {t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingPlace) return
                deletePlace.mutate(deletingPlace.id)
                setDeletingPlace(null)
              }}
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

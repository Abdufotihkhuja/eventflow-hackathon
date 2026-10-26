import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Send,
  Users,
  X,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { RentalType } from '@api/services'
import { RENTAL_TYPES } from '@api/services'
import { getMediaUrl } from '@api/config'
import { useAuth } from '@entities/auth'
import { EventLocationMap } from '@features/events/ui/event-location-map'
import {
  getPlaceCoverUrl,
  getPlaceImageUrls,
  isRentalTypeAvailable,
  getPlaceAmenityLabel,
  getRentalTypeLabel,
  useCreatePlaceRentalRequest,
  usePublicPlaceBySlug,
} from '@features/places'
import { useCurrentUser, isOrganizationUser } from '@features/profile'
import { formatCurrency, cn } from '@shared/lib'
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RichTextContent,
  Textarea,
} from '@shared/ui'

export default function PlacePublicDetailsPage() {
  const t = useT()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated } = useAuth()
  const { data: currentUser } = useCurrentUser()
  const { data: place, isLoading, isError, error } = usePublicPlaceBySlug(slug ?? null)

  const organization = isOrganizationUser(currentUser) ? currentUser.data : null
  const isOwner = !!place && !!organization && place.organizationId === organization.id
  const rentalRequest = useCreatePlaceRentalRequest()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [rentalType, setRentalType] = useState<RentalType>(RENTAL_TYPES.HOURLY)
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const coverUrl = place ? getPlaceCoverUrl(place) : null
  const imageUrls = place ? getPlaceImageUrls(place) : []
  const allImages = imageUrls.length > 0 ? imageUrls : (coverUrl ? [coverUrl] : [])

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
    setImageLightboxOpen(true)
  }, [])

  const goToPrev = useCallback(() => {
    setLightboxIndex(prev => (prev <= 0 ? allImages.length - 1 : prev - 1))
  }, [allImages.length])

  const goToNext = useCallback(() => {
    setLightboxIndex(prev => (prev >= allImages.length - 1 ? 0 : prev + 1))
  }, [allImages.length])

  const hourlyAvailable = place ? isRentalTypeAvailable(place, 'HOURLY') : false
  const dailyAvailable = place ? isRentalTypeAvailable(place, 'DAILY') : false

  const handleOpenRequest = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (hourlyAvailable) setRentalType(RENTAL_TYPES.HOURLY)
    else if (dailyAvailable) setRentalType(RENTAL_TYPES.DAILY)
    setDialogOpen(true)
  }

  const handleSubmitRequest = async () => {
    if (!place) return

    await rentalRequest.mutateAsync({
      id: place.id,
      data: {
        rentalType,
        phone,
        comment: comment.trim() || undefined,
      },
    })

    setDialogOpen(false)
    setPhone('')
    setComment('')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground dark:text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Загружаем площадку...
        </div>
      </div>
    )
  }

  if (isError || !place) {
    return (
      <div className="py-8">
        <Card className="p-8">
          <h1 className="text-2xl font-semibold text-foreground">Площадка не найдена</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error?.message ?? 'Проверьте ссылку или вернитесь в каталог.'}
          </p>
          <Button asChild className="mt-4">
            <Link to="/places">Вернуться в каталог</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const cover = coverUrl ? getMediaUrl(coverUrl) : null
  const amenities = place.amenities ?? []
  const publicSoftCardClass = 'rounded-xl'

  return (
    <div className="min-h-0 max-w-full overflow-x-hidden bg-background">
      <div className="space-y-6 overflow-x-hidden">
        <Button
          variant="ghost"
          className="-ml-2 mb-4 text-sm text-muted-foreground sm:text-base"
          asChild
        >
          <Link to={isOwner ? '/my-places' : '/places'}>
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{isOwner ? 'Назад к моим площадкам' : 'Назад к каталогу'}</span>
            <span className="sm:hidden">Назад</span>
          </Link>
        </Button>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <div className="min-w-0 space-y-6">
            <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {coverUrl ? (
                <button
                  type="button"
                  onClick={() => openLightbox(0)}
                  className="block w-full cursor-zoom-in text-left"
                >
                  <img src={cover} alt={place.title} className="aspect-[16/9] w-full object-cover" />
                </button>
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-muted text-muted-foreground">
                  Нет фотографии
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 py-4 text-white sm:px-6 sm:py-6">
                <Badge className="border-0 bg-white/15 text-white">
                  EventFlow places
                </Badge>
                <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight sm:mt-4 sm:text-3xl md:text-4xl">
                  {place.title}
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-white/85 line-clamp-2 sm:mt-2 sm:text-sm sm:leading-6 sm:line-clamp-none">
                  {place.shortDescription}
                </p>
              </div>
            </div>

            {imageUrls.length > 1 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Галерея</h2>
                <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex gap-2 overflow-x-auto pb-2 touch-scroll scrollbar-hide">
                    {imageUrls.slice(1).map((url, idx) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => openLightbox(idx + 1)}
                        className="size-[100px] shrink-0 overflow-hidden rounded-xl border border-border bg-muted transition duration-200 hover:opacity-90 active:scale-95 sm:size-[140px]"
                      >
                        <img
                          src={getMediaUrl(url)}
                          alt={place.title}
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Card className={`overflow-hidden p-4 sm:p-6 ${publicSoftCardClass}`}>
              <h2 className="text-lg font-semibold text-foreground">Тарифы аренды</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {hourlyAvailable && (
                  <div className="space-y-2 rounded-xl border border-info-soft bg-info-soft p-3 sm:space-y-3 sm:p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-info-soft sm:size-9">
                        <Clock className="size-4 text-info" />
                      </div>
                      <span className="text-sm font-medium text-info-soft-foreground">Почасовая</span>
                    </div>
                    <div className="text-xl font-bold text-foreground sm:text-2xl">
                      {formatCurrency(place.pricePerHour ?? 0, 'ru-RU', place.currency)}
                      <span className="text-sm font-normal text-muted-foreground dark:text-muted-foreground sm:text-base">/час</span>
                    </div>
                    {place.hourlyConditions && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground dark:text-muted-foreground" />
                        <span>{place.hourlyConditions}</span>
                      </div>
                    )}
                  </div>
                )}
                {dailyAvailable && (
                  <div className="space-y-2 rounded-xl border border-warning-soft bg-warning-soft p-3 sm:space-y-3 sm:p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-warning-soft sm:size-9">
                        <CalendarDays className="size-4 text-warning" />
                      </div>
                      <span className="text-sm font-medium text-warning-soft-foreground">Посуточная</span>
                    </div>
                    <div className="text-xl font-bold text-foreground sm:text-2xl">
                      {formatCurrency(place.pricePerDay ?? 0, 'ru-RU', place.currency)}
                      <span className="text-sm font-normal text-muted-foreground dark:text-muted-foreground sm:text-base">/сутки</span>
                    </div>
                    {place.dailyConditions && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground dark:text-muted-foreground" />
                        <span>{place.dailyConditions}</span>
                      </div>
                    )}
                  </div>
                )}
                {!hourlyAvailable && !dailyAvailable && place.price != null && place.price > 0 && (
                  <div className="space-y-3 rounded-xl border border-border bg-muted p-5">
                    <div className="text-sm text-muted-foreground dark:text-muted-foreground">Стоимость</div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(place.price, 'ru-RU', place.currency)}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-xl border border-border bg-muted p-3 sm:p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-10">
                    <Users className="size-4 text-muted-foreground sm:size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground sm:text-sm">Вместимость</div>
                    <div className="mt-0.5 text-lg font-semibold text-foreground sm:mt-1 sm:text-xl">
                      {place.capacity ?? '—'} гостей
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-border bg-muted p-3 sm:p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-10">
                    <MapPin className="size-4 text-muted-foreground sm:size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground sm:text-sm">Город</div>
                    <div className="mt-0.5 text-lg font-semibold text-foreground sm:mt-1 sm:text-xl">
                      {place.city || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {place.description && (
              <Card className={`overflow-hidden p-4 sm:p-6 ${publicSoftCardClass}`}>
                <h2 className="text-lg font-semibold text-foreground">Описание</h2>
                <RichTextContent content={place.description} className="mt-4 overflow-x-hidden break-words" />
              </Card>
            )}

            {amenities.length > 0 && (
              <Card className={`overflow-hidden p-4 sm:p-6 ${publicSoftCardClass}`}>
                <h2 className="text-lg font-semibold text-foreground">Удобства</h2>
                <div className="mt-4 flex flex-wrap gap-2 overflow-x-hidden">
                  {amenities.map(item => (
                    <Badge
                      key={item}
                      className="border-border bg-card text-muted-foreground"
                    >
                      {getPlaceAmenityLabel(t)(item) || item}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {place.latitude != null && place.longitude != null && (
              <Card className={`overflow-hidden p-4 sm:p-6 ${publicSoftCardClass}`}>
                <h2 className="text-lg font-semibold text-foreground">Локация</h2>
                <p className="mt-2 break-words text-sm text-muted-foreground dark:text-muted-foreground">
                  {place.address}
                  {place.addressNotes ? ` • ${place.addressNotes}` : ''}
                </p>
                <EventLocationMap
                  latitude={place.latitude}
                  longitude={place.longitude}
                  caption={place.address}
                  className="mt-4"
                  height={240}
                />
              </Card>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <Card className={`overflow-hidden rounded-xl p-5 pt-6 sm:p-6 sm:pt-8 lg:sticky lg:top-6 ${publicSoftCardClass}`}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                    <Building2 className="size-4 shrink-0" />
                    Организатор
                  </div>
                  <div className="break-words text-lg font-semibold text-foreground">
                    {place.organization?.organizationName ||
                      place.organization?.name ||
                      'Партнёр EventFlow'}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="break-words">{place.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 size-4 text-muted-foreground" />
                    <span>До {place.capacity ?? '—'} гостей</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 text-muted-foreground" />
                    <span>Контакты откроются после отправки заявки</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleOpenRequest}
                >
                  <Send />
                  Отправить заявку на аренду
                </Button>

                {!isAuthenticated && (
                  <p className="text-center text-xs text-muted-foreground dark:text-muted-foreground">
                    Для отправки заявки необходимо войти в аккаунт
                  </p>
                )}
              </div>
            </Card>
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Заявка на аренду площадки</DialogTitle>
            <DialogDescription>
              Выберите тип аренды, оставьте телефон и краткий комментарий. Организация-владелец
              получит запрос по этой площадке.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {(hourlyAvailable || dailyAvailable) && (
              <div className="space-y-3">
                <Label>Тип аренды</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {hourlyAvailable && (
                    <button
                      type="button"
                      onClick={() => setRentalType(RENTAL_TYPES.HOURLY)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                        rentalType === RENTAL_TYPES.HOURLY
                          ? 'border-info bg-info-soft ring-1 ring-info-soft'
                          : 'border-border bg-card hover:border-border',
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info-soft">
                        <Clock className="size-4 text-info" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {getRentalTypeLabel(t)(RENTAL_TYPES.HOURLY)}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold text-info">
                          {formatCurrency(place?.pricePerHour ?? 0, 'ru-RU', place?.currency ?? 'UZS')}/час
                        </div>
                        {place?.hourlyConditions && (
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
                            {place.hourlyConditions}
                          </p>
                        )}
                      </div>
                    </button>
                  )}
                  {dailyAvailable && (
                    <button
                      type="button"
                      onClick={() => setRentalType(RENTAL_TYPES.DAILY)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                        rentalType === RENTAL_TYPES.DAILY
                          ? 'border-warning bg-warning-soft ring-1 ring-warning-soft'
                          : 'border-border bg-card hover:border-border',
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft">
                        <CalendarDays className="size-4 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {getRentalTypeLabel(t)(RENTAL_TYPES.DAILY)}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold text-warning">
                          {formatCurrency(place?.pricePerDay ?? 0, 'ru-RU', place?.currency ?? 'UZS')}/сутки
                        </div>
                        {place?.dailyConditions && (
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
                            {place.dailyConditions}
                          </p>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input
                value={phone}
                onChange={event => setPhone(event.target.value)}
                placeholder="+998901234567"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Комментарий <span className="text-muted-foreground">(необязательно)</span>
              </Label>
              <Textarea
                value={comment}
                onChange={event => setComment(event.target.value)}
                placeholder="Какая дата, формат и примерное количество гостей вам нужны?"
                className="min-h-28"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={() => void handleSubmitRequest()}
              disabled={!phone.trim()}
              isLoading={rentalRequest.isPending}
            >
              <Send className="size-4" />
              Отправить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imageLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setImageLightboxOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') setImageLightboxOpen(false)
            if (e.key === 'ArrowLeft') goToPrev()
            if (e.key === 'ArrowRight') goToNext()
          }}
          role="dialog"
          tabIndex={0}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 size-10 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:right-4 sm:top-4"
            onClick={() => setImageLightboxOpen(false)}
          >
            <X className="size-5" />
          </Button>

          {allImages.length > 0 && (
            <img
              src={getMediaUrl(allImages[lightboxIndex])}
              alt={place.title}
              className="max-h-[85vh] max-w-[92vw] select-none object-contain sm:max-h-[90vh] sm:max-w-[90vw]"
              onClick={e => e.stopPropagation()}
              draggable={false}
            />
          )}

          {allImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 z-10 size-10 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:left-4 sm:size-12"
                onClick={e => {
                  e.stopPropagation()
                  goToPrev()
                }}
              >
                <ChevronLeft className="size-5 sm:size-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 z-10 size-10 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:right-4 sm:size-12"
                onClick={e => {
                  e.stopPropagation()
                  goToNext()
                }}
              >
                <ChevronRight className="size-5 sm:size-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm sm:bottom-6 sm:px-4 sm:py-1.5 sm:text-sm">
                {lightboxIndex + 1} / {allImages.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

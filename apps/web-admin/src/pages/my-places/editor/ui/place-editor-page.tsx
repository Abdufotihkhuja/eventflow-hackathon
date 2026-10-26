import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLocale, useT } from '@eventflow/i18n/react'
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Loader2,
  MapPinned,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import type { CreatePlaceRequest, Place, PlaceCurrency } from '@api/services'
import { getMediaUrl } from '@api/config'
import { EventLocationMap } from '@features/events/ui/event-location-map'
import { EventLocationPicker } from '@features/events/ui/event-location-picker'
import { useCurrentUser, isOrganizationUser } from '@features/profile'
import {
  getPlaceImageUrls,
  PLACE_AMENITY_OPTIONS,
  PLACE_CURRENCY_LABEL_KEYS,
  PLACE_STATUS_LABEL_KEYS,
  PLACE_STATUS_STYLES,
  useArchivePlace,
  useCreatePlace,
  useDeletePlace,
  usePlace,
  usePublishPlace,
  useUpdatePlace,
  useUploadPlaceImage,
} from '@features/places'
import { formatCurrency, getDescriptionText, isValidSlug, cn } from '@shared/lib'
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
  type BlockNoteContent,
  Button,
  Card,
  CitySelect,
  Input,
  Label,
  RichTextEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shared/ui'

type PlaceFormState = {
  title: string
  slug: string
  shortDescription: string
  description: BlockNoteContent
  pricePerHour: string
  pricePerDay: string
  currency: PlaceCurrency
  hourlyConditions: string
  dailyConditions: string
  capacity: string
  amenities: string[]
  address: string
  addressNotes: string
  city: string
  latitude?: number
  longitude?: number
  placeId: string
  imageUrls: string[]
}

const DEFAULT_FORM: PlaceFormState = {
  title: '',
  slug: '',
  shortDescription: '',
  description: [],
  pricePerHour: '',
  pricePerDay: '',
  currency: 'UZS',
  hourlyConditions: '',
  dailyConditions: '',
  capacity: '',
  amenities: [],
  address: '',
  addressNotes: '',
  city: '',
  latitude: undefined,
  longitude: undefined,
  placeId: '',
  imageUrls: [],
}

const editorGhostClass = ''

const editorFieldClass = ''

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200)
}

function toFormState(place?: Place | null): PlaceFormState {
  if (!place) return DEFAULT_FORM

  return {
    title: place.title ?? '',
    slug: place.slug ?? '',
    shortDescription: place.shortDescription ?? '',
    description: Array.isArray(place.description) ? place.description : [],
    pricePerHour: place.pricePerHour != null ? String(place.pricePerHour) : '',
    pricePerDay: place.pricePerDay != null ? String(place.pricePerDay) : '',
    currency: place.currency ?? 'UZS',
    hourlyConditions: place.hourlyConditions ?? '',
    dailyConditions: place.dailyConditions ?? '',
    capacity: place.capacity != null ? String(place.capacity) : '',
    amenities: place.amenities ?? [],
    address: place.address ?? '',
    addressNotes: place.addressNotes ?? '',
    city: place.city ?? '',
    latitude: place.latitude,
    longitude: place.longitude,
    placeId: place.placeId ?? '',
    imageUrls: getPlaceImageUrls(place),
  }
}

export default function PlaceEditorPage() {
  const t = useT()
  const locale = useLocale()
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const placeId = params.id ?? null
  const isEditMode = Boolean(placeId)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { data: currentUser } = useCurrentUser()
  const organization = isOrganizationUser(currentUser) ? currentUser.data : null
  const { data: place, isLoading } = usePlace(placeId)

  const createPlace = useCreatePlace()
  const updatePlace = useUpdatePlace()
  const publishPlace = usePublishPlace()
  const archivePlace = useArchivePlace()
  const deletePlace = useDeletePlace()
  const uploadPlaceImage = useUploadPlaceImage()

  const [form, setForm] = useState<PlaceFormState>(DEFAULT_FORM)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!place) return
    setForm(toFormState(place))
    setSlugTouched(true)
  }, [place])

  useEffect(() => {
    if (slugTouched) return
    setForm(prev => ({ ...prev, slug: slugify(prev.title) }))
  }, [form.title, slugTouched])

  const placeStatus = place?.status ?? 'DRAFT'
  const isSubmitting =
    createPlace.isPending ||
    updatePlace.isPending ||
    publishPlace.isPending ||
    archivePlace.isPending ||
    deletePlace.isPending

  const handleField = <K extends keyof PlaceFormState>(key: K, value: PlaceFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleAmenityToggle = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(item => item !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setSubmitError(null)
    setIsUploadingImages(true)

    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadPlaceImage.mutateAsync(file)
        uploadedUrls.push(url)
      }

      setForm(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedUrls],
      }))
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('admin.batch1.placeEditorPage.s001'))
    } finally {
      setIsUploadingImages(false)
    }
  }

  const removeImage = (url: string) => {
    setForm(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter(item => item !== url),
    }))
  }

  const hasAnyPrice =
    (form.pricePerHour.trim() && Number(form.pricePerHour) > 0) ||
    (form.pricePerDay.trim() && Number(form.pricePerDay) > 0)

  const validate = useCallback((): string | null => {
    if (!form.title.trim()) return t('admin.batch1.placeEditorPage.s002')
    if (form.slug.trim() && !isValidSlug(form.slug)) {
      return t('admin.batch1.placeEditorPage.s003')
    }
    if (!hasAnyPrice) return t('admin.batch1.placeEditorPage.s004')
    if (!form.address.trim()) return t('admin.batch1.placeEditorPage.s005')
    if (form.latitude == null || form.longitude == null) return t('admin.batch1.placeEditorPage.s006')
    if (form.imageUrls.length === 0) return t('admin.batch1.placeEditorPage.s007')
    return null
  }, [form, hasAnyPrice])

  const toPayload = useCallback((): CreatePlaceRequest => {
    const hourly = form.pricePerHour.trim() ? Number(form.pricePerHour) : undefined
    const daily = form.pricePerDay.trim() ? Number(form.pricePerDay) : undefined

    return {
      title: form.title.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim().toLowerCase() } : {}),
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description,
      pricePerHour: hourly && hourly > 0 ? hourly : undefined,
      pricePerDay: daily && daily > 0 ? daily : undefined,
      currency: form.currency,
      hourlyConditions: form.hourlyConditions.trim() || undefined,
      dailyConditions: form.dailyConditions.trim() || undefined,
      capacity: form.capacity.trim() ? Number(form.capacity) : undefined,
      amenities: form.amenities,
      address: form.address.trim(),
      addressNotes: form.addressNotes.trim() || undefined,
      city: form.city.trim() || undefined,
      latitude: form.latitude!,
      longitude: form.longitude!,
      placeId: form.placeId.trim() || undefined,
      imageUrls: form.imageUrls,
    }
  }, [form])

  const handleSubmit = useCallback(async () => {
    const validationError = validate()
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    setSubmitError(null)
    const payload = toPayload()

    try {
      if (placeId) {
        await updatePlace.mutateAsync({ id: placeId, data: payload })
      } else {
        const created = await createPlace.mutateAsync(payload)
        navigate(`/my-places/${created.id}`, { replace: true })
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('admin.batch1.placeEditorPage.s008'))
    }
  }, [
    createPlace,
    navigate,
    placeId,
    toPayload,
    updatePlace,
    validate,
  ])

  useEffect(() => {
    const handleSaveHotkey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (isSubmitting || isUploadingImages) return

      void handleSubmit()
    }

    window.addEventListener('keydown', handleSaveHotkey)

    return () => {
      window.removeEventListener('keydown', handleSaveHotkey)
    }
  }, [handleSubmit, isSubmitting, isUploadingImages])

  if (!organization) {
    return (
      <Card className="p-8">
        <h2 className="text-xl font-semibold text-foreground">{t('admin.batch1.placeEditorPage.s009')}</h2>
      </Card>
    )
  }

  if (!organization.placesFeatureEnabled) {
    return (
      <Card className="p-8">
        <h2 className="text-xl font-semibold text-foreground">{t('admin.batch1.placeEditorPage.s010')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('admin.batch1.placeEditorPage.s011')}</p>
      </Card>
    )
  }

  if (isEditMode && isLoading) {
    return (
      <Card className="flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />{t('admin.batch1.placeEditorPage.s012')}</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[30px] border border-border bg-card px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Button
              variant="ghost"
              className="-ml-3 w-fit text-muted-foreground"
              onClick={() => navigate('/my-places')}
            >
              <ArrowLeft />{t('admin.batch1.placeEditorPage.s013')}</Button>
            <div className="space-y-3">
              <Badge className="border-0 bg-muted text-muted-foreground">
                {isEditMode ? t('admin.batch1.placeEditorPage.s014') : t('admin.batch1.placeEditorPage.s015')}
              </Badge>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {isEditMode ? place?.title || t('admin.batch1.placeEditorPage.s016') : t('admin.batch1.placeEditorPage.s017')}
                </h1>
                {isEditMode && (
                  <Badge className={cn('border', PLACE_STATUS_STYLES[placeStatus])}>
                    {t(PLACE_STATUS_LABEL_KEYS[placeStatus])}
                  </Badge>
                )}
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('admin.batch1.placeEditorPage.s018')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {place?.slug && (
              <Button asChild variant="outline" className={editorGhostClass}>
                <Link to={`/places/${place.slug}`}>
                  <Globe2 />{t('admin.batch1.placeEditorPage.s019')}</Link>
              </Button>
            )}
            {placeId && placeStatus !== 'PUBLISHED' && (
              <Button
                disabled={isSubmitting}
                onClick={() => publishPlace.mutate(placeId)}
              >
                <Send />{t('admin.batch1.placeEditorPage.s020')}</Button>
            )}
            {placeId && placeStatus === 'PUBLISHED' && (
              <Button
                variant="outline"
                className={editorGhostClass}
                disabled={isSubmitting}
                onClick={() => archivePlace.mutate(placeId)}
              >
                <Archive />{t('admin.batch1.placeEditorPage.s021')}</Button>
            )}
            <Button
              disabled={isSubmitting || isUploadingImages}
              onClick={handleSubmit}
            >
              <Save />{t('admin.batch1.placeEditorPage.s022')}</Button>
          </div>
        </div>
      </section>

      {submitError && (
        <Card className="border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
          {submitError}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">{t('admin.batch1.placeEditorPage.s023')}</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={event => handleField('title', event.target.value)}
                    placeholder="Loft Hall Tashkent"
                    className={editorFieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">
                    Slug
                  </Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={event => {
                      setSlugTouched(true)
                      handleField('slug', event.target.value.toLowerCase())
                    }}
                    placeholder="loft-hall-tashkent"
                    className={editorFieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">{t('admin.batch1.placeEditorPage.s024')}</Label>
                  <CitySelect
                    id="city"
                    value={form.city}
                    onChange={value => handleField('city', value)}
                    placeholder={t('admin.batch1.placeEditorPage.s025')}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="short-description">{t('admin.batch1.placeEditorPage.s026')}</Label>
                  <Textarea
                    id="short-description"
                    value={form.shortDescription}
                    onChange={event => handleField('shortDescription', event.target.value)}
                    className={cn('min-h-24', editorFieldClass)}
                    placeholder={t('admin.batch1.placeEditorPage.s027')}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{t('admin.batch1.placeEditorPage.s028')}</Label>
                  <div className="rounded-2xl border border-border bg-card">
                    <RichTextEditor
                      value={form.description}
                      onChange={value => handleField('description', value)}
                      placeholder={t('admin.batch1.placeEditorPage.s029')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">{t('admin.batch1.placeEditorPage.s030')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('admin.batch1.placeEditorPage.s031')}</p>
              </div>

              <div className="space-y-2">
                <Label>{t('admin.batch1.placeEditorPage.s032')}</Label>
                <Select
                  value={form.currency}
                  onValueChange={value => handleField('currency', value as PlaceCurrency)}
                >
                  <SelectTrigger className={cn('w-40', editorFieldClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLACE_CURRENCY_LABEL_KEYS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-border bg-muted p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-info-soft">
                      <span className="text-sm font-bold text-info-soft-foreground">H</span>
                    </div>
                    <span className="font-medium">{t('admin.batch1.placeEditorPage.s033')}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerHour">{t('admin.batch1.placeEditorPage.s034')}</Label>
                    <Input
                      id="pricePerHour"
                      type="number"
                      min={0}
                      value={form.pricePerHour}
                      onChange={event => handleField('pricePerHour', event.target.value)}
                      placeholder="50 000"
                      className={editorFieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyConditions">{t('admin.batch1.placeEditorPage.s035')}<span className="text-muted-foreground">{t('admin.batch1.placeEditorPage.s036')}</span>
                    </Label>
                    <Textarea
                      id="hourlyConditions"
                      value={form.hourlyConditions}
                      onChange={event => handleField('hourlyConditions', event.target.value)}
                      className={cn('min-h-20', editorFieldClass)}
                      placeholder={t('admin.batch1.placeEditorPage.s037')}
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-muted p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-warning-soft">
                      <span className="text-sm font-bold text-warning-soft-foreground">D</span>
                    </div>
                    <span className="font-medium">{t('admin.batch1.placeEditorPage.s038')}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerDay">{t('admin.batch1.placeEditorPage.s039')}</Label>
                    <Input
                      id="pricePerDay"
                      type="number"
                      min={0}
                      value={form.pricePerDay}
                      onChange={event => handleField('pricePerDay', event.target.value)}
                      placeholder="250 000"
                      className={editorFieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyConditions">{t('admin.batch1.placeEditorPage.s035')}<span className="text-muted-foreground">{t('admin.batch1.placeEditorPage.s036')}</span>
                    </Label>
                    <Textarea
                      id="dailyConditions"
                      value={form.dailyConditions}
                      onChange={event => handleField('dailyConditions', event.target.value)}
                      className={cn('min-h-20', editorFieldClass)}
                      placeholder={t('admin.batch1.placeEditorPage.s040')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="capacity">{t('admin.batch1.placeEditorPage.s041')}</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={event => handleField('capacity', event.target.value)}
                  placeholder="150"
                  className={editorFieldClass}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">{t('admin.batch1.placeEditorPage.s042')}</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={event => handleField('address', event.target.value)}
                  placeholder={t('admin.batch1.placeEditorPage.s043')}
                  className={editorFieldClass}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="address-notes">{t('admin.batch1.placeEditorPage.s044')}</Label>
                <Textarea
                  id="address-notes"
                  value={form.addressNotes}
                  onChange={event => handleField('addressNotes', event.target.value)}
                  className={cn('min-h-20', editorFieldClass)}
                  placeholder={t('admin.batch1.placeEditorPage.s045')}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{t('admin.batch1.placeEditorPage.s046')}</h2>
                  <p className="text-sm text-muted-foreground">{t('admin.batch1.placeEditorPage.s047')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={editorGhostClass}
                  onClick={handleUploadClick}
                  disabled={isUploadingImages}
                >
                  {isUploadingImages ? <Loader2 className="animate-spin" /> : <ImagePlus />}{t('admin.batch1.placeEditorPage.s048')}</Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  className="hidden"
                  onChange={event => void handleImageFiles(event.target.files)}
                />
              </div>

              {form.imageUrls.length === 0 ? (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex min-h-52 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-border hover:bg-muted"
                >
                  <Upload className="size-7" />
                  <span className="mt-3 text-sm font-medium">{t('admin.batch1.placeEditorPage.s049')}</span>
                </button>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {form.imageUrls.map((url, index) => (
                    <div
                      key={url}
                      className="group relative overflow-hidden rounded-3xl border border-border bg-muted"
                    >
                      <img
                        src={getMediaUrl(url)}
                        alt={t('admin.batch1.placeEditorPage.photoAlt', { index: index + 1 })}
                        className="aspect-[1.1] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                        <Badge className="border-border bg-foreground/80 text-background">
                          {index === 0
                            ? t('admin.batch1.placeEditorPage.s050')
                            : t('admin.batch1.placeEditorPage.photoLabel', { index: index + 1 })}
                        </Badge>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-label="Удалить фото"
                          className="size-9"
                          onClick={() => removeImage(url)}
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{t('admin.batch1.placeEditorPage.s051')}</h2>
                <p className="text-sm text-muted-foreground">{t('admin.batch1.placeEditorPage.s052')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLACE_AMENITY_OPTIONS.map(option => {
                  const active = form.amenities.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleAmenityToggle(option.value)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm transition',
                        active
                          ? 'border-primary bg-success-soft text-success-soft-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-border'
                      )}
                    >
                      {t(option.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{t('admin.batch1.placeEditorPage.s053')}</h2>
                <p className="text-sm text-muted-foreground">{t('admin.batch1.placeEditorPage.s054')}</p>
              </div>
              <EventLocationPicker
                value={{
                  latitude: form.latitude,
                  longitude: form.longitude,
                  placeId: form.placeId || undefined,
                }}
                onChange={change => {
                  setForm(prev => ({
                    ...prev,
                    latitude: change.latitude,
                    longitude: change.longitude,
                    placeId: change.placeId ?? prev.placeId,
                    address: change.address ?? prev.address,
                    city: change.city ?? prev.city,
                  }))
                }}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6 p-6">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" />{t('admin.batch1.placeEditorPage.s055')}</div>

              <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
                <div className="aspect-[1.2] bg-muted">
                  {form.imageUrls[0] ? (
                    <img
                      src={getMediaUrl(form.imageUrls[0])}
                      alt={form.title || t('admin.batch1.placeEditorPage.s056')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">{t('admin.batch1.placeEditorPage.s057')}</div>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {form.title || t('admin.batch1.placeEditorPage.s023')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {form.city || t('admin.batch1.placeEditorPage.s024')}{' '}
                      {form.capacity
                        ? t('admin.batch1.placeEditorPage.capacitySuffix', {
                            capacity: form.capacity,
                          })
                        : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {form.pricePerHour && Number(form.pricePerHour) > 0 && (
                        <Badge className="border-border bg-info-soft text-info-soft-foreground">
                          {formatCurrency(Number(form.pricePerHour), locale, form.currency)}{t('admin.batch1.placeEditorPage.s058')}</Badge>
                      )}
                      {form.pricePerDay && Number(form.pricePerDay) > 0 && (
                        <Badge className="border-border bg-warning-soft text-warning-soft-foreground">
                          {formatCurrency(Number(form.pricePerDay), locale, form.currency)}{t('admin.batch1.placeEditorPage.s059')}</Badge>
                      )}
                      {!form.pricePerHour && !form.pricePerDay && (
                        <Badge className="border-border bg-muted text-muted-foreground">{t('admin.batch1.placeEditorPage.s060')}</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {form.shortDescription ||
                      getDescriptionText(form.description as never, 140) ||
                      t('admin.batch1.placeEditorPage.s061')}
                  </p>

                  <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <MapPinned className="size-4" />
                      {form.address || t('admin.batch1.placeEditorPage.s062')}
                    </div>
                    {form.addressNotes && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {form.addressNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {form.amenities.slice(0, 4).map(item => (
                      <Badge
                        key={item}
                        className="border-border bg-card text-muted-foreground"
                      >
                        {PLACE_AMENITY_OPTIONS.find(option => option.value === item)?.labelKey
                          ? t(PLACE_AMENITY_OPTIONS.find(option => option.value === item)!.labelKey)
                          : item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {form.latitude != null && form.longitude != null && (
                <EventLocationMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  caption={form.address || form.title}
                  className="shadow-sm"
                />
              )}

              {placeId && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    disabled={isSubmitting}
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 />{t('admin.batch1.placeEditorPage.s063')}</Button>

                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.batch1.placeEditorPage.s064')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('admin.batch1.placeEditorPage.deleteDescription', {
                            title: place?.title ?? t('admin.batch1.placeEditorPage.s065'),
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('admin.batch1.placeEditorPage.s066')}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            deletePlace.mutate(placeId, {
                              onSuccess: () => navigate('/my-places', { replace: true }),
                            })
                            setIsDeleteDialogOpen(false)
                          }}
                        >{t('admin.batch1.placeEditorPage.s067')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

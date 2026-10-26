import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import type { CreatePlaceRequest, Place, PlaceCurrency } from '@api/services'
import { getMediaUrl } from '@api/config'
import { EventLocationMap } from '@features/events/ui/event-location-map'
import { EventLocationPicker } from '@features/events/ui/event-location-picker'
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  createRichTranslationMetaDraft,
  createRichTranslationsDraft,
  getBatchTranslationFailureMessage,
  getBatchTranslationItems,
  getFallbackBusinessTranslation,
  getFirstNonEmptyRichLocale,
  isRichDocEmpty,
  markRichEmpty,
  markRichManualEdit,
  markRichTargetsOutdatedWhenSourceChanged,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type RichTranslationMetaDraft,
  type RichTranslationsDraft,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from '@features/translations'
import { useCurrentUser, isOrganizationUser } from '@features/profile'
import {
  getPlaceImageUrls,
  PLACE_AMENITY_OPTIONS,
  getPlaceCurrencyLabel,
  getPlaceAmenityLabel,
  getPlaceStatusLabel,
  useArchivePlace,
  useCreatePlace,
  useDeletePlace,
  usePlace,
  usePublishPlace,
  useUpdatePlace,
  useUploadPlaceImage,
} from '@features/places'
import {
  formatCurrency,
  getDescriptionText,
  isBlockNoteDocument,
  isValidSlug,
  cn,
  type BlockNoteDocument,
} from '@shared/lib'
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
  StatusPill,
  statusPillTone,
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

const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const PLACE_TRANSLATION_FIELD_KEYS = ['title', 'shortDescription'] as const
const PLACE_RICH_FIELD_KEY = 'description'

// Studio system: rely on the shared token-based primitives for theming (they
// already flip for dark mode). No bespoke slate/cyan admin overrides here.
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

function completeTranslationValues(values: TranslationValues): TranslationValues {
  return Object.fromEntries(
    Object.entries(values).map(([fieldKey, localeValues]) => {
      const fallback = getFallbackBusinessTranslation(values, fieldKey)
      return [
        fieldKey,
        Object.fromEntries(
          BUSINESS_LOCALES.map(locale => [locale, localeValues[locale]?.trim() || fallback])
        ),
      ]
    })
  ) as TranslationValues
}

function completeRichTranslations(
  fieldDraft: RichTranslationsDraft['description']
): RichTranslationsDraft['description'] {
  const fallbackLocale = BUSINESS_LOCALES.find(locale => {
    const doc = fieldDraft[locale]
    return doc && !isRichDocEmpty(doc)
  })
  const fallbackDoc = fallbackLocale ? fieldDraft[fallbackLocale] : undefined

  if (!fallbackDoc) return fieldDraft

  return Object.fromEntries(
    BUSINESS_LOCALES.map(locale => [locale, fieldDraft[locale] ?? fallbackDoc])
  ) as RichTranslationsDraft['description']
}

function completeRichMeta(
  fieldDraft: RichTranslationsDraft['description'],
  fieldMeta: RichTranslationMetaDraft['description']
): RichTranslationMetaDraft['description'] {
  return Object.fromEntries(
    BUSINESS_LOCALES.map(locale => [
      locale,
      fieldMeta[locale] ??
        (fieldDraft[locale] && !isRichDocEmpty(fieldDraft[locale])
          ? { status: 'manual' as const }
          : { status: 'empty' as const }),
    ])
  ) as RichTranslationMetaDraft['description']
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
  const translateBatch = useTranslateBatch()

  const [form, setForm] = useState<PlaceFormState>(DEFAULT_FORM)
  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(() =>
    createBusinessTranslationValues(PLACE_TRANSLATION_FIELD_KEYS, undefined, {})
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(PLACE_TRANSLATION_FIELD_KEYS, undefined, translationValues)
  )
  const [richDraft, setRichDraft] = useState<RichTranslationsDraft>(() => ({
    description: {},
  }))
  const [richMeta, setRichMeta] = useState<RichTranslationMetaDraft>(() => ({
    description: {},
  }))
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!place) return
    const nextForm = toFormState(place)
    setForm(nextForm)
    const nextTranslations = createBusinessTranslationValues(
      PLACE_TRANSLATION_FIELD_KEYS,
      place.translations,
      {
        title: place.title,
        shortDescription: place.shortDescription,
      }
    )
    setTranslationValues(nextTranslations)
    setTranslationMeta(
      createBusinessTranslationMeta(
        PLACE_TRANSLATION_FIELD_KEYS,
        place.translationMeta,
        nextTranslations
      )
    )
    const nextRichDraft = createRichTranslationsDraft(
      PLACE_RICH_FIELD_KEY,
      place.richTranslations,
      nextForm.description
    )
    setRichDraft(nextRichDraft)
    setRichMeta(
      createRichTranslationMetaDraft(PLACE_RICH_FIELD_KEY, place.richTranslationMeta, nextRichDraft)
    )
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

  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    PLACE_TRANSLATION_FIELD_KEYS,
    activeLocale
  )
  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'title',
        label: t('workspace.places.editor.fields.title'),
        placeholder: 'Loft Hall Tashkent',
        maxLength: 200,
      },
      {
        key: 'shortDescription',
        label: t('workspace.places.editor.fields.shortDescription'),
        placeholder: t('workspace.places.editor.placeholders.shortDescription'),
        maxLength: 500,
        multiline: true,
        rows: 3,
      },
    ],
    [t]
  )

  const syncScalarFallbacks = useCallback((values: TranslationValues) => {
    setForm(prev => ({
      ...prev,
      title: getFallbackBusinessTranslation(values, 'title', prev.title),
      shortDescription: getFallbackBusinessTranslation(
        values,
        'shortDescription',
        prev.shortDescription
      ),
    }))
  }, [])

  const handleTranslationChange = (fieldKey: string, locale: AppLocale, value: string) => {
    const next = setBusinessTranslationValue(
      translationValues,
      translationMeta,
      fieldKey,
      locale,
      value
    )
    setTranslationValues(next.values)
    setTranslationMeta(next.meta)
    syncScalarFallbacks(next.values)
  }

  const handleTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocale) {
      toast.error(t('common.translations.addTextBeforeTranslating'))
      return
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      PLACE_TRANSLATION_FIELD_KEYS,
      sourceLocale,
      mode
    )

    if (items.length === 0) {
      toast.info(t('common.translations.noEligibleFields'))
      return
    }

    const beforeValues = translationValues
    const beforeMeta = translationMeta
    translateBatch.mutate(
      {
        sourceLocale,
        targetLocales: BUSINESS_LOCALES.filter(locale => locale !== sourceLocale),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(beforeValues, beforeMeta, response, {
            mode,
          })
          const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode)
          setTranslationValues(applied.values)
          setTranslationMeta(applied.meta)
          syncScalarFallbacks(applied.values)
          if (summary.failed > 0) {
            const failureMessage = getBatchTranslationFailureMessage(response)
            toast.error(t('common.translations.translationIssueTitle'), {
              description: failureMessage ?? t('common.translations.translationIssueDescription', summary),
            })
            return
          }
          toast.success(t('common.translations.translatedToastTitle'), {
            description: t('common.translations.translatedToastDescription', summary),
          })
        },
        onError: error => {
          toast.error(error?.message ?? t('common.translations.serviceFailed'))
        },
      }
    )
  }

  const handleRichDescriptionChange = (content: BlockNoteDocument) => {
    const nextDraft: RichTranslationsDraft = {
      description: {
        ...richDraft.description,
        [activeLocale]: content,
      },
    }
    const manualMeta = isRichDocEmpty(content)
      ? markRichEmpty(richMeta, PLACE_RICH_FIELD_KEY, activeLocale)
      : markRichManualEdit(richMeta, PLACE_RICH_FIELD_KEY, activeLocale)
    const nextMeta = markRichTargetsOutdatedWhenSourceChanged(
      manualMeta,
      PLACE_RICH_FIELD_KEY,
      activeLocale,
      content
    )
    const fallbackLocale = getFirstNonEmptyRichLocale(nextDraft, activeLocale)

    setRichDraft(nextDraft)
    setRichMeta(nextMeta)
    if (fallbackLocale) {
      handleField('description', nextDraft.description[fallbackLocale] ?? content)
    } else {
      handleField('description', content)
    }
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
      setSubmitError(error instanceof Error ? error.message : t('workspace.places.editor.uploadImagesError'))
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
    if (!form.title.trim()) return t('workspace.places.editor.validation.titleRequired')
    if (form.slug.trim() && !isValidSlug(form.slug)) {
      return t('workspace.places.editor.validation.invalidSlug')
    }
    if (!hasAnyPrice) return t('workspace.places.editor.validation.priceRequired')
    if (!form.address.trim()) return t('workspace.places.editor.validation.addressRequired')
    if (form.latitude == null || form.longitude == null) {
      return t('workspace.places.editor.validation.mapPointRequired')
    }
    if (form.imageUrls.length === 0) return t('workspace.places.editor.validation.imageRequired')
    return null
  }, [form, hasAnyPrice, t])

  const toPayload = useCallback((): CreatePlaceRequest => {
    const hourly = form.pricePerHour.trim() ? Number(form.pricePerHour) : undefined
    const daily = form.pricePerDay.trim() ? Number(form.pricePerDay) : undefined
    const completedRichDescription = completeRichTranslations(richDraft.description)

    return {
      title: form.title.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim().toLowerCase() } : {}),
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description,
      translations: completeTranslationValues(translationValues),
      translationMeta,
      richTranslations: {
        description: completedRichDescription,
      },
      richTranslationMeta: {
        description: completeRichMeta(completedRichDescription, richMeta.description),
      },
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
  }, [form, richDraft.description, richMeta.description, translationMeta, translationValues])

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
      setSubmitError(error instanceof Error ? error.message : t('workspace.places.editor.saveError'))
    }
  }, [
    createPlace,
    navigate,
    placeId,
    t,
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
        <h2 className="text-xl font-semibold">
          {t('workspace.places.access.editorOwnerOnlyTitle')}
        </h2>
      </Card>
    )
  }

  if (!organization.placesFeatureEnabled) {
    return (
      <Card className="p-8">
        <h2 className="text-xl font-semibold">
          {t('workspace.places.access.editorFeatureDisabledTitle')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('workspace.places.access.editorFeatureDisabledDescription')}
        </p>
      </Card>
    )
  }

  if (isEditMode && isLoading) {
    return (
      <Card className="flex min-h-72 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          {t('workspace.places.editor.loading')}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-xl border border-border bg-card px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="-ml-3 w-fit text-muted-foreground"
              onClick={() => navigate('/my-places')}
            >
              <ArrowLeft />
              {t('workspace.places.editor.backToList')}
            </Button>
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {isEditMode
                  ? t('workspace.places.editor.badgeEdit')
                  : t('workspace.places.editor.badgeNew')}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-[28px]">
                  {isEditMode
                    ? place?.title || t('workspace.places.editor.titleEditFallback')
                    : t('workspace.places.editor.titleCreate')}
                </h1>
                {isEditMode && (
                  <StatusPill tone={statusPillTone(placeStatus)} size="sm">
                    {getPlaceStatusLabel(t)(placeStatus)}
                  </StatusPill>
                )}
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {t('workspace.places.editor.description')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {place?.slug && (
              <Button asChild variant="outline" className={cn('bg-card/80', editorGhostClass)}>
                <Link to={`/places/${place.slug}`}>
                  <Globe2 />
                  {t('workspace.places.editor.publicCard')}
                </Link>
              </Button>
            )}
            {placeId && placeStatus !== 'PUBLISHED' && (
              <Button
                disabled={isSubmitting}
                onClick={() => publishPlace.mutate(placeId)}
              >
                <Send />
                {t('workspace.places.editor.publish')}
              </Button>
            )}
            {placeId && placeStatus === 'PUBLISHED' && (
              <Button
                variant="outline"
                className={editorGhostClass}
                disabled={isSubmitting}
                onClick={() => archivePlace.mutate(placeId)}
              >
                <Archive />
                {t('workspace.places.editor.archive')}
              </Button>
            )}
            <Button
              disabled={isSubmitting || isUploadingImages}
              onClick={handleSubmit}
            >
              <Save />
              {t('workspace.places.editor.save')}
            </Button>
          </div>
        </div>
      </section>

      {submitError && (
        <Card className="border-destructive/30 p-4 text-sm text-destructive">
          {submitError}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-3 md:col-span-2">
                  <MultilingualTabsField
                    fields={translationFields}
                    values={translationValues}
                    meta={translationMeta}
                    activeLocale={activeLocale}
                    onLocaleChange={setActiveLocale}
                    onValueChange={handleTranslationChange}
                  />
                  <TranslateFieldsToolbar
                    sourceLocale={sourceLocale}
                    activeLocale={activeLocale}
                    isPending={translateBatch.isPending}
                    disabled={!sourceLocale}
                    onTranslateEmpty={() => handleTranslate('fill_empty')}
                    onUpdateAuto={() => handleTranslate('update_auto')}
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
                  <Label htmlFor="city">
                    {t('workspace.places.editor.fields.city')}
                  </Label>
                  <CitySelect
                    id="city"
                    value={form.city}
                    onChange={value => handleField('city', value)}
                    placeholder={t('workspace.places.editor.placeholders.city')}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>
                    {t('workspace.places.editor.fields.fullDescription')}
                  </Label>
                  <div className="rounded-2xl border border-border bg-card">
                    <RichTextEditor
                      key={`place-description-${activeLocale}`}
                      value={
                        richDraft.description[activeLocale] ??
                        (activeLocale === 'ru' && isBlockNoteDocument(form.description)
                          ? form.description
                          : [])
                      }
                      onChange={value => handleRichDescriptionChange(value as BlockNoteDocument)}
                      placeholder={t('workspace.places.editor.placeholders.fullDescription')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">
                  {t('workspace.places.editor.pricing.title')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('workspace.places.editor.pricing.description')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  {t('workspace.places.editor.fields.currency')}
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={value => handleField('currency', value as PlaceCurrency)}
                >
                  <SelectTrigger className={cn('w-40', editorFieldClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['RUB', 'USD', 'EUR', 'UZS'] as const).map(value => (
                      <SelectItem key={value} value={value}>
                        {getPlaceCurrencyLabel(t)(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                      <span className="text-sm font-bold text-muted-foreground">H</span>
                    </div>
                    <span className="font-medium">
                      {t('workspace.places.editor.pricing.hourly')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerHour">
                      {t('workspace.places.editor.pricing.pricePerHour')}
                    </Label>
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
                    <Label htmlFor="hourlyConditions">
                      {t('workspace.places.editor.pricing.conditions')}{' '}
                      <span className="text-muted-foreground">
                        {t('workspace.places.editor.pricing.optional')}
                      </span>
                    </Label>
                    <Textarea
                      id="hourlyConditions"
                      value={form.hourlyConditions}
                      onChange={event => handleField('hourlyConditions', event.target.value)}
                      className={cn('min-h-20', editorFieldClass)}
                      placeholder={t('workspace.places.editor.placeholders.hourlyConditions')}
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                      <span className="text-sm font-bold text-muted-foreground">D</span>
                    </div>
                    <span className="font-medium">
                      {t('workspace.places.editor.pricing.daily')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerDay">
                      {t('workspace.places.editor.pricing.pricePerDay')}
                    </Label>
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
                    <Label htmlFor="dailyConditions">
                      {t('workspace.places.editor.pricing.conditions')}{' '}
                      <span className="text-muted-foreground">
                        {t('workspace.places.editor.pricing.optional')}
                      </span>
                    </Label>
                    <Textarea
                      id="dailyConditions"
                      value={form.dailyConditions}
                      onChange={event => handleField('dailyConditions', event.target.value)}
                      className={cn('min-h-20', editorFieldClass)}
                      placeholder={t('workspace.places.editor.placeholders.dailyConditions')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="capacity">
                  {t('workspace.places.editor.fields.capacity')}
                </Label>
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
                <Label htmlFor="address">
                  {t('workspace.places.editor.fields.address')}
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={event => handleField('address', event.target.value)}
                  placeholder={t('workspace.places.editor.placeholders.address')}
                  className={editorFieldClass}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="address-notes">
                  {t('workspace.places.editor.fields.addressNotes')}
                </Label>
                <Textarea
                  id="address-notes"
                  value={form.addressNotes}
                  onChange={event => handleField('addressNotes', event.target.value)}
                  className={cn('min-h-20', editorFieldClass)}
                  placeholder={t('workspace.places.editor.placeholders.addressNotes')}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {t('workspace.places.editor.photos.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('workspace.places.editor.photos.description')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={editorGhostClass}
                  onClick={handleUploadClick}
                  disabled={isUploadingImages}
                >
                  {isUploadingImages ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {t('workspace.places.editor.photos.upload')}
                </Button>
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
                  className="flex min-h-52 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-secondary/40 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-secondary"
                >
                  <Upload className="size-7" />
                  <span className="mt-3 text-sm font-medium">
                    {t('workspace.places.editor.photos.dropzone')}
                  </span>
                </button>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {form.imageUrls.map((url, index) => (
                    <div
                      key={url}
                      className="group relative overflow-hidden rounded-3xl border border-border bg-secondary"
                    >
                      <img
                        src={getMediaUrl(url)}
                        alt={t('workspace.places.editor.photos.alt', { index: index + 1 })}
                        className="aspect-[1.1] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                        <Badge className="border-white/30 bg-black/50 text-white">
                          {index === 0
                            ? t('workspace.places.editor.photos.cover')
                            : t('workspace.places.editor.photos.photo', { index: index + 1 })}
                        </Badge>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
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
                <h2 className="text-lg font-semibold">
                  {t('workspace.places.editor.amenities.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('workspace.places.editor.amenities.description')}
                </p>
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
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                <h2 className="text-lg font-semibold">
                  {t('workspace.places.editor.location.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('workspace.places.editor.location.description')}
                </p>
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
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="size-4" />
                {t('workspace.places.editor.preview.title')}
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="aspect-[1.2] bg-secondary">
                  {form.imageUrls[0] ? (
                    <img
                      src={getMediaUrl(form.imageUrls[0])}
                      alt={form.title || t('workspace.places.editor.photos.cover')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {t('workspace.places.editor.preview.coverPlaceholder')}
                    </div>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {form.title || t('workspace.places.editor.preview.titlePlaceholder')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {form.city || t('workspace.places.editor.preview.cityPlaceholder')}{' '}
                      {form.capacity
                        ? `• ${t('workspace.places.editor.preview.guestsUpTo', {
                            capacity: form.capacity,
                          })}`
                        : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {form.pricePerHour && Number(form.pricePerHour) > 0 && (
                        <Badge className="border-border bg-secondary text-foreground">
                          {formatCurrency(Number(form.pricePerHour), 'ru-RU', form.currency)}
                          {t('workspace.places.editor.preview.perHour')}
                        </Badge>
                      )}
                      {form.pricePerDay && Number(form.pricePerDay) > 0 && (
                        <Badge className="border-border bg-secondary text-foreground">
                          {formatCurrency(Number(form.pricePerDay), 'ru-RU', form.currency)}
                          {t('workspace.places.editor.preview.perDay')}
                        </Badge>
                      )}
                      {!form.pricePerHour && !form.pricePerDay && (
                        <Badge className="border-border bg-secondary text-muted-foreground">
                          {t('workspace.places.editor.preview.noPrice')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {form.shortDescription ||
                      getDescriptionText(form.description as never, 140) ||
                      t('workspace.places.editor.preview.descriptionPlaceholder')}
                  </p>

                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <MapPinned className="size-4" />
                      {form.address || t('workspace.places.editor.preview.addressPlaceholder')}
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
                        className="text-muted-foreground"
                      >
                        {getPlaceAmenityLabel(t)(item) || item}
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
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isSubmitting}
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 />
                    {t('workspace.places.editor.delete')}
                  </Button>

                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('workspace.places.editor.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('workspace.places.list.deleteDescription', {
                            title: place?.title ?? t('workspace.places.editor.unnamed'),
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                          {t('actions.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            deletePlace.mutate(placeId, {
                              onSuccess: () => navigate('/my-places', { replace: true }),
                            })
                            setIsDeleteDialogOpen(false)
                          }}
                        >
                          {t('actions.delete')}
                        </AlertDialogAction>
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

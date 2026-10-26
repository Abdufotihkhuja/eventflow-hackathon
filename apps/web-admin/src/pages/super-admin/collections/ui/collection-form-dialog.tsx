/**
 * Диалог создания/редактирования подборки (Super Admin)
 * Обложка: загрузка файла через POST …/cover-upload. Либо градиент, либо обложка.
 * Slug: проверка доступности через GET …/check-slug после debounce.
 * События: мультивыбор через GET /collections/available-events.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useT } from '@eventflow/i18n/react'
import type { AdminCollection, CreateAdminCollectionRequest } from '@api/services/superAdmin.types'
import { getMediaUrl } from '@api/config'
import {
  useCheckCollectionSlug,
  useUploadCollectionCover,
  useAvailableCollectionEvents,
  useAdminCollectionEvents,
  COLLECTION_SLUG_VALID_REGEX,
} from '@features/super-admin'
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getFallbackBusinessTranslation,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from '@features/translations'
import { useDebounce } from '@shared/lib/use-debounce'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Switch,
  ScrollArea,
  Checkbox,
} from '@shared/ui'
import { Loader2, Upload, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

type CoverMode = 'gradient' | 'cover'

const COVER_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp'
const COVER_MAX_SIZE_MB = 5
const SLUG_DEBOUNCE_MS = 400
const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const COLLECTION_FIELD_KEYS = ['title', 'description'] as const

function toFormString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

type CollectionFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection: AdminCollection | null
  defaultValues?: Partial<CreateAdminCollectionRequest>
  onSubmit: (data: CreateAdminCollectionRequest, selectedEventIds: string[]) => void
  isPending?: boolean
}

export function CollectionFormDialog({
  open,
  onOpenChange,
  collection,
  defaultValues,
  onSubmit,
  isPending,
}: CollectionFormDialogProps) {
  const t = useT()
  const isEdit = !!collection
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [slug, setSlug] = useState('')
  const [coverMode, setCoverMode] = useState<CoverMode>('cover')
  const [coverImage, setCoverImage] = useState('')
  const [gradientStart, setGradientStart] = useState('')
  const [gradientEnd, setGradientEnd] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [selectedEventTitles, setSelectedEventTitles] = useState<Record<string, string>>({})
  const [eventsSearch, setEventsSearch] = useState('')
  const [eventsPage, setEventsPage] = useState(1)
  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(
    () => createBusinessTranslationValues(COLLECTION_FIELD_KEYS, undefined, {})
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(
    () => createBusinessTranslationMeta(COLLECTION_FIELD_KEYS, undefined, translationValues)
  )

  const debouncedSlug = useDebounce(toFormString(slug).trim().toLowerCase(), SLUG_DEBOUNCE_MS)
  const debouncedEventsSearch = useDebounce(eventsSearch.trim(), 400)
  const slugCheck = useCheckCollectionSlug(
    debouncedSlug,
    isEdit && collection ? String(collection.id) : undefined
  )
  const slugTrim = toFormString(slug).trim()
  const slugInvalidFormat =
    slugTrim.length > 0 && !COLLECTION_SLUG_VALID_REGEX.test(slugTrim.toLowerCase())

  const uploadCover = useUploadCollectionCover()
  const translateBatch = useTranslateBatch()
  const collectionId = collection?.id ?? null
  const { data: collectionEventsData } = useAdminCollectionEvents(open && collectionId ? collectionId : null)
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    COLLECTION_FIELD_KEYS,
    activeLocale
  )
  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'title',
        label: t('admin.collections.title'),
        placeholder: t('admin.collections.titlePlaceholder'),
        maxLength: 200,
      },
      {
        key: 'description',
        label: t('admin.collections.description'),
        placeholder: t('admin.collections.descriptionPlaceholder'),
        maxLength: 1000,
        multiline: true,
        rows: 2,
      },
    ],
    [t]
  )

  const availableEventsParams = useMemo(
    () =>
      open
        ? {
            page: eventsPage,
            limit: 20,
            search: debouncedEventsSearch || undefined,
          }
        : undefined,
    [open, eventsPage, debouncedEventsSearch]
  )
  const { data: availableEventsData, isLoading: availableEventsLoading } = useAvailableCollectionEvents(
    availableEventsParams,
    { enabled: open }
  )

  const availableEvents = availableEventsData?.data ?? []
  const availableTotal = availableEventsData?.total ?? 0
  const availableLimit = availableEventsData?.limit ?? 20
  const eventsTotalPages = Math.max(1, Math.ceil(availableTotal / availableLimit))

  useEffect(() => {
    if (open) {
      setSlug(toFormString(collection?.slug ?? defaultValues?.slug))
      const hasCover = !!(collection?.coverImage ?? defaultValues?.coverImage)
      const hasGradient =
        !!(collection?.gradientStart ?? defaultValues?.gradientStart) &&
        !!(collection?.gradientEnd ?? defaultValues?.gradientEnd)
      setCoverMode(hasCover ? 'cover' : hasGradient ? 'gradient' : 'cover')
      setCoverImage(toFormString(collection?.coverImage ?? defaultValues?.coverImage))
      setGradientStart(toFormString(collection?.gradientStart ?? defaultValues?.gradientStart))
      setGradientEnd(toFormString(collection?.gradientEnd ?? defaultValues?.gradientEnd))
      setIsActive(collection?.isActive ?? defaultValues?.isActive ?? true)
      const values = createBusinessTranslationValues(
        COLLECTION_FIELD_KEYS,
        collection?.translations ?? defaultValues?.translations,
        {
          title: collection?.title ?? defaultValues?.title,
          description: collection?.description ?? defaultValues?.description,
        }
      )
      setTranslationValues(values)
      setTranslationMeta(
        createBusinessTranslationMeta(
          COLLECTION_FIELD_KEYS,
          collection?.translationMeta ?? defaultValues?.translationMeta,
          values
        )
      )
      setActiveLocale('ru')
      setCoverError(null)
      setEventsSearch('')
      setEventsPage(1)
      setSelectedEventIds(defaultValues?.eventIds ?? [])
      setSelectedEventTitles({})
    }
  }, [
    open,
    collection?.id,
    collection?.slug,
    collection?.coverImage,
    collection?.gradientStart,
    collection?.gradientEnd,
    collection?.description,
    collection?.isActive,
    collection?.title,
    collection?.translations,
    collection?.translationMeta,
    defaultValues?.eventIds,
    defaultValues?.title,
    defaultValues?.slug,
    defaultValues?.coverImage,
    defaultValues?.gradientStart,
    defaultValues?.gradientEnd,
    defaultValues?.description,
    defaultValues?.isActive,
    defaultValues?.translations,
    defaultValues?.translationMeta,
  ])

  useEffect(() => {
    const raw = collectionEventsData ?? []
    if (
      open &&
      collection &&
      raw.length > 0 &&
      selectedEventIds.length === 0
    ) {
      const sorted = [...raw].sort((a, b) => a.sortOrder - b.sortOrder)
      const ids = sorted.map(item => item.event.id)
      const titles = Object.fromEntries(
        sorted.map(item => [item.event.id, item.event.title])
      )
      setSelectedEventIds(ids)
      setSelectedEventTitles(titles)
    }
  }, [open, collection, collectionEventsData, selectedEventIds.length])

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverError(null)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setCoverError(t('admin.collections.invalidCoverType'))
      return
    }
    if (file.size > COVER_MAX_SIZE_MB * 1024 * 1024) {
      setCoverError(t('admin.collections.coverSizeError', { size: COVER_MAX_SIZE_MB }))
      return
    }
    uploadCover.mutate(file, {
      onSuccess: res => {
        setCoverImage(res.url)
        setCoverMode('cover')
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
    })
  }

  const handleRemoveCover = () => {
    setCoverImage('')
    setCoverError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleEventSelection = useCallback((id: string, title: string) => {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setSelectedEventTitles(prev => {
      const next = { ...prev }
      if (next[id] !== undefined) delete next[id]
      else next[id] = title
      return next
    })
  }, [])

  const removeSelectedEvent = useCallback((id: string) => {
    setSelectedEventIds(prev => prev.filter(x => x !== id))
    setSelectedEventTitles(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const titleTrim = getFallbackBusinessTranslation(translationValues, 'title')
    const descriptionTrim = getFallbackBusinessTranslation(translationValues, 'description')
    const slugTrimVal = slug.trim()
    if (!titleTrim || !slugTrimVal) return

    if (coverMode === 'cover') {
      if (!coverImage.trim()) {
        setCoverError(t('admin.collections.coverRequired'))
        return
      }
      setCoverError(null)
      onSubmit(
        {
          title: titleTrim,
          slug: slugTrimVal,
          coverImage: coverImage.trim(),
          gradientStart: undefined,
          gradientEnd: undefined,
          description: descriptionTrim || undefined,
          translations: translationValues,
          translationMeta,
          isActive,
        },
        selectedEventIds
      )
      return
    }

    const gStart = gradientStart.trim()
    const gEnd = gradientEnd.trim()
    if (!gStart || !gEnd) {
      setCoverError(t('admin.collections.gradientRequired'))
      return
    }
    setCoverError(null)
    onSubmit(
      {
        title: titleTrim,
        slug: slugTrimVal,
        coverImage: undefined,
        gradientStart: gStart,
        gradientEnd: gEnd,
        description: descriptionTrim || undefined,
        translations: translationValues,
        translationMeta,
        isActive,
      },
      selectedEventIds
    )
  }

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
  }

  const handleTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocale) {
      toast.error('Add text in at least one language before translating.')
      return
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      COLLECTION_FIELD_KEYS,
      sourceLocale,
      mode
    )

    if (items.length === 0) {
      toast.info('No eligible fields to translate.')
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
          toast.success(
            `Translated: ${summary.translated}. Skipped: ${summary.skipped}. Failed: ${summary.failed}.`
          )
        },
        onError: error => {
          toast.error(error?.message ?? 'Translation service failed.')
        },
      }
    )
  }

  const coverDisplayUrl = coverImage
    ? coverImage.startsWith('http')
      ? coverImage
      : getMediaUrl(coverImage)
    : undefined

  const slugUnavailable =
    !!debouncedSlug && slugCheck.isFetched && slugCheck.data?.available === false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('admin.collections.editTitle') : t('admin.collections.newTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('admin.collections.editDescription')
              : t('admin.collections.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={isPending || !sourceLocale}
            onTranslateEmpty={() => handleTranslate('fill_empty')}
            onUpdateAuto={() => handleTranslate('update_auto')}
          />
          <div className="space-y-2">
            <Label htmlFor="col-slug">Slug *</Label>
            <Input
              id="col-slug"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="url-slug (a-z, 0-9, -)"
              className="font-mono"
              required
              aria-invalid={slugUnavailable || slugInvalidFormat}
            />
            {slugInvalidFormat && (
              <p className="text-sm text-destructive">{t('admin.categories.slugHint')}</p>
            )}
            {!slugInvalidFormat && debouncedSlug.length > 0 && (
              <>
                {slugCheck.isFetching && (
                  <p className="text-sm text-muted-foreground">{t('admin.categories.checking')}</p>
                )}
                {slugCheck.isFetched && !slugCheck.error && slugCheck.data && (
                  <p
                    className={
                      slugCheck.data.available
                        ? 'text-sm text-success'
                        : 'text-sm text-destructive'
                    }
                  >
                    {slugCheck.data.available
                      ? t('admin.collections.slugAvailable')
                      : t('admin.collections.slugTaken')}
                  </p>
                )}
                {slugCheck.error && (
                  <p className="text-sm text-destructive">
                    {t('admin.collections.slugCheckError')}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <Label>{t('admin.collections.cover')}</Label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="coverMode"
                  checked={coverMode === 'cover'}
                  onChange={() => setCoverMode('cover')}
                  className="h-4 w-4"
                />
                <span>{t('admin.collections.photo')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="coverMode"
                  checked={coverMode === 'gradient'}
                  onChange={() => setCoverMode('gradient')}
                  className="h-4 w-4"
                />
                <span>{t('admin.collections.gradient')}</span>
              </label>
            </div>

            {coverMode === 'cover' ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={COVER_ACCEPT}
                  onChange={handleCoverFileChange}
                  className="hidden"
                  aria-invalid={!!coverError}
                />
                {coverDisplayUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className="flex h-16 w-24 shrink-0 overflow-hidden rounded border bg-background">
                      <img
                        src={coverDisplayUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                      {t('admin.collections.coverUploaded')}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadCover.isPending}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadCover.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          t('admin.actions.replace')
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCover}
                        disabled={uploadCover.isPending}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={uploadCover.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadCover.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {t('admin.collections.uploadCover')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="col-grad-start">{t('admin.collections.gradientStart')}</Label>
                  <Input
                    id="col-grad-start"
                    value={gradientStart}
                    onChange={e => setGradientStart(e.target.value)}
                    placeholder="#000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="col-grad-end">{t('admin.collections.gradientEnd')}</Label>
                  <Input
                    id="col-grad-end"
                    value={gradientEnd}
                    onChange={e => setGradientEnd(e.target.value)}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            )}
            {coverError && <p className="text-sm text-destructive">{coverError}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('admin.collections.events')}</Label>
            {selectedEventIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 p-2">
                {selectedEventIds.map(id => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs"
                  >
                    {selectedEventTitles[id] ?? id}
                    <button
                      type="button"
                      onClick={() => removeSelectedEvent(id)}
                      className="rounded p-0.5 hover:bg-destructive/20"
                      aria-label={t('admin.actions.remove')}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('admin.collections.searchEvents')}
                value={eventsSearch}
                onChange={e => {
                  setEventsSearch(e.target.value)
                  setEventsPage(1)
                }}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[140px] rounded-lg border">
              <ul className="space-y-1 p-2">
                {availableEventsLoading ? (
                  <li className="flex items-center justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </li>
                ) : (
                  availableEvents
                    .filter(e => !selectedEventIds.includes(e.id))
                    .map(event => (
                      <li
                        key={event.id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={() =>
                            toggleEventSelection(event.id, event.title)
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">{event.title}</span>
                      </li>
                    ))
                )}
              </ul>
            </ScrollArea>
            {!availableEventsLoading &&
              availableEvents.filter(e => !selectedEventIds.includes(e.id)).length === 0 &&
              availableEvents.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.collections.allEventsSelected')}
                </p>
              )}
            {eventsTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                  disabled={eventsPage <= 1 || availableEventsLoading}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {eventsPage} / {eventsTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEventsPage(p => Math.min(eventsTotalPages, p + 1))
                  }
                  disabled={eventsPage >= eventsTotalPages || availableEventsLoading}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="col-active">{t('admin.collections.active')}</Label>
            <Switch id="col-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('admin.actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? t('admin.actions.save') : t('admin.actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

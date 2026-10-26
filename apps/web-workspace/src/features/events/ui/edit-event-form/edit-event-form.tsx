import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useT } from '@eventflow/i18n/react'

import {
  ACCESS_TYPE_LABEL_KEYS,
  AccessType,
  CURRENCY_OPTIONS,
  EVENT_FORMAT_LABEL_KEYS,
  EVENT_TYPE_LABEL_KEYS,
  EventFormat,
  EventStatus,
  EventType,
  getCurrencyLabel,
  getEventStatusLabel,
  type Event,
} from '@entities/event'
import { eventsService, type UpdateEventRequest } from '@api/services'
import {
  createCreateEventSchema,
  type CreateEventFormValues,
} from '@features/events/lib/schemas/create-event-schema'
import {
  useSubmitEventForReview,
  useSuggestEventSlug,
  useCheckEventSlug,
} from '@features/events/api'
import { EventLivePreview } from '@features/events/ui/event-live-preview'
import { EventLocationPicker } from '@features/events/ui/event-location-picker'
import { EventMediaUpload } from '@features/events/ui/event-media-upload'
import { EventCategoriesField } from '@features/events/ui/event-categories-field'
import { EventDescriptionRichTranslationField } from '@features/events/ui/event-description-rich-translation-field'
import { RegistrationDeadlineField } from '@features/events/ui/registration-deadline-field/registration-deadline-field'
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getBatchTranslationFailureMessage,
  getFallbackBusinessTranslation,
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
import { PublishCreditsNote } from '@features/billing'
import { getBannerTemplate, isBannerTemplate } from '../../lib/banner-templates'
import { cn } from '@shared/lib/cn'
import { useDebounce } from '@shared/lib/use-debounce'
import {
  SLUG_VALID_REGEX,
  SLUG_MAX_LENGTH,
  toDateTimeLocalValue,
  toISO8601Z,
  toOptionalNumber,
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
  Button,
  Card,
  Checkbox,
  CitySelect,
  DateTimeInput,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumberInput,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusPill,
  statusPillTone,
  Switch,
} from '@shared/ui'

type EditEventFormProps = {
  event: Event
  onSuccess?: () => void
}

const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const EVENT_TRANSLATION_FIELD_KEYS = ['title', 'shortDescription', 'venue'] as const
const EVENT_BASIC_TRANSLATION_FIELD_KEYS = ['title', 'shortDescription'] as const

function completeEventTranslationValues(
  values: TranslationValues,
  fallbackScalars: Record<string, string | null | undefined>
): TranslationValues {
  return Object.fromEntries(
    Object.entries(values).map(([fieldKey, localeValues]) => {
      const fallback =
        getFallbackBusinessTranslation(values, fieldKey, fallbackScalars[fieldKey] ?? '') || ''

      return [
        fieldKey,
        Object.fromEntries(
          BUSINESS_LOCALES.map(locale => [locale, localeValues[locale]?.trim() || fallback])
        ),
      ]
    })
  ) as TranslationValues
}

// Преобразует coverImage события в формат EventMediaValue
function coverImageToEventMedia(
  coverImage: string | null | undefined
): { type: 'file' | 'template'; url?: string; template?: string } | undefined {
  if (!coverImage) return undefined

  // Если это шаблон (например, "template:purple_sunset")
  if (isBannerTemplate(coverImage)) {
    const template = getBannerTemplate(coverImage)
    if (template) {
      return { type: 'template', template }
    }
    return undefined
  }

  // Иначе это URL файла
  return { type: 'file', url: coverImage }
}

export function EditEventForm({ event, onSuccess }: EditEventFormProps) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const translateBatch = useTranslateBatch()
  const submitForReview = useSubmitEventForReview()

  const [errorMessage, setErrorMessage] = React.useState<string>('')
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const [activeLocale, setActiveLocale] = React.useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = React.useState<TranslationValues>(() =>
    createBusinessTranslationValues(EVENT_TRANSLATION_FIELD_KEYS, event.translations, {
      title: event.title,
      shortDescription: event.shortDescription,
      venue: event.venue,
    })
  )
  const [translationMeta, setTranslationMeta] = React.useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(EVENT_TRANSLATION_FIELD_KEYS, event.translationMeta, translationValues)
  )
  const [richDraft, setRichDraft] = React.useState<RichTranslationsDraft>(() => ({
    description: {},
  }))
  const [richMeta, setRichMeta] = React.useState<RichTranslationMetaDraft>(() => ({
    description: {},
  }))

  const updateEvent = useMutation({
    mutationFn: (data: UpdateEventRequest) => eventsService.updateEvent(event.id, data),
    onSuccess: () => {
      setErrorMessage('')
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', event.id] })
      queryClient.invalidateQueries({ queryKey: ['events', 'list'] })
    },
    onError: (error: any) => {
      // Ошибка уже нормализована в api interceptor (config.ts)
      // Структура: { message, status, isNetworkError, details }
      const message = error?.message || t('events.form.updateError')
      setErrorMessage(message)
      console.error('Update event error:', error)
    },
  })

  // Парсим description для редактора
  const parseDescription = (desc: any): any => {
    if (!desc) return ''
    // Если это уже массив блоков — возвращаем как есть
    if (Array.isArray(desc)) return desc
    // Если это объект с полем blocks
    if (typeof desc === 'object' && desc.blocks) return desc.blocks
    // Если это строка, пробуем распарсить JSON
    if (typeof desc === 'string') {
      try {
        const parsed = JSON.parse(desc)
        if (Array.isArray(parsed)) return parsed
        if (parsed.blocks) return parsed.blocks
      } catch {
        // Если не JSON — вернем строку, редактор создаст из неё блок
        return desc
      }
    }
    return desc
  }

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createCreateEventSchema(t)) as any,
    defaultValues: {
      title: event.title,
      slug: event.slug ?? '',
      description: parseDescription(event.description),
      shortDescription: event.shortDescription || '',
      type: event.type as EventType,
      accessType: (event.accessType as AccessType) || AccessType.OPEN,
      format: event.format as EventFormat,
      startDate: toDateTimeLocalValue(event.startDate),
      endDate: toDateTimeLocalValue(event.endDate),
      registrationDeadline: toDateTimeLocalValue(event.registrationDeadline ?? undefined),
      venue: event.venue || '',
      address: event.address || '',
      city: event.city || '',
      latitude: toOptionalNumber(event.latitude),
      longitude: toOptionalNumber(event.longitude),
      placeId: event.placeId ?? undefined,
      onlineUrl: event.onlineUrl || '',
      price: toOptionalNumber(event.price),
      currency: event.currency || 'UZS',
      eventMedia: coverImageToEventMedia(event.coverImage),
      maxParticipants: event.maxParticipants ?? undefined,
      commentsEnabled: event.commentsEnabled ?? true,
      registrationOpen: event.registrationOpen ?? true,
      categoryIds: event.categories?.map(category => category.id) ?? [],
      speakers: [],
      agenda: [],
      customQuestions: [],
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  const selectedType = form.watch('type')
  const selectedFormat = form.watch('format')
  const title = form.watch('title')
  const slug = form.watch('slug')
  const initialDescription = React.useMemo(
    () => parseDescription(event.description),
    [event.description]
  )
  const { setValue } = form
  const debouncedTitle = useDebounce(title, 400)
  const debouncedSlug = useDebounce(slug, 400)
  const suggestSlug = useSuggestEventSlug(debouncedTitle, event.id)
  const slugCheck = useCheckEventSlug(debouncedSlug, event.id)
  const lastSuggestedSlugRef = React.useRef<string>(event.slug ?? '')

  const isPaid = selectedType === EventType.PAID
  const isOnline = selectedFormat === EventFormat.ONLINE
  const isOffline = selectedFormat === EventFormat.OFFLINE || selectedFormat === EventFormat.HYBRID
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    EVENT_BASIC_TRANSLATION_FIELD_KEYS,
    activeLocale
  )
  const translationFields = React.useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'title',
        label: t('events.form.titleLabel'),
        placeholder: t('events.form.titlePlaceholder'),
        maxLength: 200,
      },
      {
        key: 'shortDescription',
        label: t('events.form.shortDescriptionLabel'),
        placeholder: t('events.form.shortDescriptionPlaceholder'),
        maxLength: 500,
        multiline: true,
        rows: 3,
      },
    ],
    [t]
  )
  const venueTranslationFields = React.useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'venue',
        label: t('events.form.venueLabel', { required: isOffline ? '*' : '' }),
        placeholder: t('events.form.venuePlaceholder'),
        maxLength: 200,
      },
    ],
    [isOffline, t]
  )

  // Очищаем price при переключении на бесплатный тип
  React.useEffect(() => {
    if (!isPaid) {
      setValue('price', undefined)
    }
  }, [isPaid, setValue])

  // Подстановка slug из suggest: обновляем при смене title, если slug пустой или не менялся вручную
  React.useEffect(() => {
    if (!suggestSlug.data?.slug) return
    const suggested = suggestSlug.data.slug
    const current = (slug ?? '').trim()
    if (current === '' || current === lastSuggestedSlugRef.current) {
      setValue('slug', suggested, { shouldDirty: true })
      lastSuggestedSlugRef.current = suggested
    }
  }, [suggestSlug.data?.slug, setValue, slug])

  const syncScalarFallbacks = React.useCallback(
    (values: TranslationValues) => {
      setValue('title', getFallbackBusinessTranslation(values, 'title', event.title), {
        shouldDirty: true,
        shouldValidate: true,
      })
      setValue(
        'shortDescription',
        getFallbackBusinessTranslation(values, 'shortDescription', event.shortDescription ?? ''),
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      )
      setValue('venue', getFallbackBusinessTranslation(values, 'venue', event.venue ?? ''), {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [event.shortDescription, event.title, event.venue, setValue]
  )

  const handleRichChange = React.useCallback(
    (draft: RichTranslationsDraft, meta: RichTranslationMetaDraft) => {
      setRichDraft(draft)
      setRichMeta(meta)
    },
    []
  )

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
      EVENT_BASIC_TRANSLATION_FIELD_KEYS,
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

  const onSubmit = async (
    data: CreateEventFormValues,
    submitReview = false
  ): Promise<void> => {
    try {
      setErrorMessage('') // Очищаем предыдущую ошибку
      const {
        eventMedia,
        speakers: _speakers,
        agenda: _agenda,
        customQuestions: _customQuestions,
        ...restData
      } = data

      // Определяем coverImage на основе eventMedia
      let coverImage: string | undefined
      if (eventMedia?.type === 'file' && eventMedia.url) {
        coverImage = eventMedia.url
      } else if (eventMedia?.type === 'template' && eventMedia.template) {
        coverImage = `template:${eventMedia.template}`
      }

      // Backend ожидает description как массив блоков напрямую
      const description = restData.description
      const fallbackTitle = getFallbackBusinessTranslation(translationValues, 'title', restData.title)
      const fallbackShortDescription = getFallbackBusinessTranslation(
        translationValues,
        'shortDescription',
        restData.shortDescription
      )
      const completedTranslationValues = completeEventTranslationValues(translationValues, {
        title: restData.title,
        shortDescription: restData.shortDescription,
        venue: restData.venue,
      })
      const fallbackVenue = getFallbackBusinessTranslation(
        completedTranslationValues,
        'venue',
        restData.venue
      )

      const slugTrim = restData.slug?.trim()
      // Даты в ISO 8601 с Z (бэкенд требует явную таймзону)
      const requestData: any = {
        title: fallbackTitle,
        ...(slugTrim ? { slug: slugTrim } : {}),
        description,
        shortDescription: fallbackShortDescription || undefined,
        translations: completedTranslationValues,
        translationMeta,
        richTranslations: {
          description: richDraft.description,
        },
        richTranslationMeta: {
          description: richMeta.description,
        },
        coverImage,
        type: restData.type,
        accessType: restData.accessType,
        format: restData.format,
        startDate: toISO8601Z(restData.startDate),
        endDate: toISO8601Z(restData.endDate),
        // Явный null когда дедлайн выключен/сброшен — иначе очистка не сохранится
        // (undefined/'' вычищаются ниже и PATCH оставит старое значение).
        registrationDeadline: restData.registrationDeadline
          ? toISO8601Z(restData.registrationDeadline)
          : null,
        venue: fallbackVenue,
        address: restData.address,
        city: restData.city,
        latitude: restData.latitude ?? undefined,
        longitude: restData.longitude ?? undefined,
        placeId: restData.placeId ?? undefined,
        onlineUrl: restData.onlineUrl,
        price: restData.price !== undefined ? Number(restData.price) : undefined,
        currency: restData.currency,
        // Явный null когда лимит очищен — иначе undefined вычистится ниже
        // и PATCH оставит старое ограничение.
        maxParticipants:
          restData.maxParticipants !== undefined ? Number(restData.maxParticipants) : null,
        commentsEnabled: restData.commentsEnabled,
        registrationOpen: restData.registrationOpen,
        categoryIds: restData.categoryIds ?? [],
      }

      // Убираем undefined поля
      Object.keys(requestData).forEach(key => {
        if (requestData[key] === undefined || requestData[key] === '') {
          delete requestData[key]
        }
      })

      await updateEvent.mutateAsync(requestData as UpdateEventRequest)
      if (submitReview) {
        await submitForReview.mutateAsync(event.id)
      }
      onSuccess?.()
      navigate(`/my-events/${event.id}`)
    } catch (error) {
      console.error('Failed to update event:', error)
    }
  }

  const handleSaveChanges = form.handleSubmit(data => onSubmit(data as CreateEventFormValues, false))
  const handleSubmitForReview = form.handleSubmit(data =>
    onSubmit(data as CreateEventFormValues, true)
  )
  const isBusy = updateEvent.isPending || submitForReview.isPending
  const isDraft = event.status === EventStatus.DRAFT
  // Отправить на модерацию можно только черновик с будущим стартом (проверка
  // на бэкенде) — у прошедшего черновика кнопка вела бы в 400.
  const canSubmitForReview = isDraft && new Date(event.startDate).getTime() > Date.now()

  return (
    <Form {...form}>
      <form onSubmit={handleSaveChanges} className="space-y-6">
        <PageHeader
          eyebrow={t('events.studio.editKicker')}
          title={t('events.form.editTitle')}
          description={t('events.form.editDescription')}
          meta={
            <StatusPill tone={statusPillTone(event.status)} size="sm">
              {getEventStatusLabel(t)(event.status)}
            </StatusPill>
          }
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDiscardOpen(true)}
                disabled={isBusy}
              >
                {t('events.studio.discard')}
              </Button>
              <Button type="submit" variant={isDraft ? 'outline' : 'default'} disabled={isBusy}>
                {updateEvent.isPending && !submitForReview.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {t('events.form.saveChanges')}
              </Button>
              {canSubmitForReview && (
                <Button type="button" onClick={() => void handleSubmitForReview()} disabled={isBusy}>
                  {submitForReview.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t('events.studio.submitForReview')}
                </Button>
              )}
            </>
          }
        />

        {/* C-12: кредиты публикации видны, пока черновик можно отправить на
            модерацию. Ничего для START (eventCredits null) и при S-19 OFF. */}
        {canSubmitForReview && <PublishCreditsNote />}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            {/* Основная информация */}
            <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.form.basicInfo')}</h2>
          <div className="space-y-4">
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
            {form.formState.errors.title?.message && (
              <p className="text-sm text-destructive">
                {String(form.formState.errors.title.message)}
              </p>
            )}
            {form.formState.errors.shortDescription?.message && (
              <p className="text-sm text-destructive">
                {String(form.formState.errors.shortDescription.message)}
              </p>
            )}

            <FormField
              control={form.control as any}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.form.slugLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('events.form.slugPlaceholder')}
                      maxLength={SLUG_MAX_LENGTH}
                      className={cn(
                        (slugCheck.data?.available === false ||
                          (field.value?.trim() &&
                            !SLUG_VALID_REGEX.test(field.value.trim().toLowerCase()))) &&
                          'border-destructive'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('events.form.slugDescriptionEdit')}
                  </FormDescription>
                  {field.value?.trim() &&
                    SLUG_VALID_REGEX.test(field.value.trim().toLowerCase()) &&
                    debouncedSlug.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {slugCheck.isFetching && t('events.form.slugChecking')}
                        {slugCheck.isFetched &&
                          slugCheck.data &&
                          (slugCheck.data.available
                            ? t('events.form.slugAvailable')
                            : t('events.form.slugTaken'))}
                      </p>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <EventDescriptionRichTranslationField
              activeLocale={activeLocale}
              onLocaleChange={setActiveLocale}
              initialDescription={initialDescription}
              initialRichTranslations={event.richTranslations}
              initialRichTranslationMeta={event.richTranslationMeta}
              onRichChange={handleRichChange}
            />

            <FormField
              control={form.control as any}
              name="eventMedia"
              render={({ field }) => (
                <EventMediaUpload value={field.value} onChange={field.onChange} hideTemplates />
              )}
            />
          </div>
        </Card>

        {/* Тип и формат */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.form.typeAndFormat')}</h2>
          <div className="space-y-4">
            <FormField
              control={form.control as any}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.form.eventTypeLabel')}</FormLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.entries(EVENT_TYPE_LABEL_KEYS).map(([type, labelKey]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => field.onChange(type)}
                        className={cn(
                          'rounded-lg border p-4 text-left transition',
                          field.value === type
                            ? 'border-brand-secondary bg-brand-secondary/10 shadow-sm'
                            : 'border-border bg-transparent hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border-2 transition',
                              field.value === type
                                ? 'border-brand-secondary bg-brand-secondary'
                                : 'border-muted-foreground/30'
                            )}
                          />
                          <span className="font-medium text-foreground">{t(labelKey)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="accessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.form.accessTypeLabel')}</FormLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {Object.entries(ACCESS_TYPE_LABEL_KEYS).map(([accessType, labelKey]) => (
                      <button
                        key={accessType}
                        type="button"
                        onClick={() => field.onChange(accessType)}
                        className={cn(
                          'rounded-lg border p-4 text-left transition',
                          field.value === accessType
                            ? 'border-brand-secondary bg-brand-secondary/10 shadow-sm'
                            : 'border-border bg-transparent hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border-2 transition',
                              field.value === accessType
                                ? 'border-brand-secondary bg-brand-secondary'
                                : 'border-muted-foreground/30'
                            )}
                          />
                          <span className="font-medium text-foreground">{t(labelKey)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <FormDescription>
                    {field.value === AccessType.OPEN
                      ? t('events.accessDescription.open')
                      : field.value === AccessType.REQUEST
                        ? t('events.accessDescription.request')
                        : field.value === AccessType.INVITE_ONLY
                          ? t('events.accessDescription.inviteOnly')
                          : t('events.accessDescription.private')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.form.formatLabel')}</FormLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {Object.entries(EVENT_FORMAT_LABEL_KEYS).map(([format, labelKey]) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => field.onChange(format)}
                        className={cn(
                          'rounded-lg border p-4 text-center transition',
                          field.value === format
                            ? 'border-brand-secondary bg-brand-secondary/10 shadow-sm'
                            : 'border-border bg-transparent hover:bg-muted/30'
                        )}
                      >
                        <span className="font-medium text-foreground">{t(labelKey)}</span>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.form.categoriesLabel')}</FormLabel>
                  <FormControl>
                    <EventCategoriesField
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('events.form.categoriesDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Стоимость */}
        {isPaid && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.form.participationCost')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control as any}
                name="price"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t('events.form.priceLabel')}</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="0"
                        allowDecimal
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.form.currencyLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? 'UZS'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('events.form.currencyPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map(currency => (
                          <SelectItem key={currency} value={currency}>
                            {getCurrencyLabel(t)(currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
        )}

        {/* Даты */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.form.dates')}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control as any}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.form.startDateLabel')}</FormLabel>
                    <FormControl>
                      <DateTimeInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        id="startDate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.form.endDateLabel')}</FormLabel>
                    <FormControl>
                      <DateTimeInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        id="endDate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <RegistrationDeadlineField form={form} />
          </div>
        </Card>

        {/* Локация */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.form.location')}</h2>
          <div className="space-y-4">
            {isOffline && (
              <>
                <MultilingualTabsField
                  fields={venueTranslationFields}
                  values={translationValues}
                  meta={translationMeta}
                  activeLocale={activeLocale}
                  onLocaleChange={setActiveLocale}
                  onValueChange={handleTranslationChange}
                />
                {form.formState.errors.venue?.message && (
                  <p className="text-sm text-destructive">
                    {String(form.formState.errors.venue.message)}
                  </p>
                )}
                <FormField
                  control={form.control as any}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.form.addressLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('events.form.addressPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.form.cityLabel')}</FormLabel>
                      <FormControl>
                        <CitySelect
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('events.form.cityPlaceholder')}
                        />
                      </FormControl>
                      <FormDescription>{t('events.form.cityHint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <EventLocationPicker
                  value={{
                    latitude: form.watch('latitude'),
                    longitude: form.watch('longitude'),
                    placeId: form.watch('placeId'),
                  }}
                  onChange={change => {
                    setValue('latitude', change.latitude)
                    setValue('longitude', change.longitude)
                    if (change.placeId != null) setValue('placeId', change.placeId)
                    if (change.venue != null) {
                      const next = setBusinessTranslationValue(
                        translationValues,
                        translationMeta,
                        'venue',
                        activeLocale,
                        change.venue
                      )
                      setTranslationValues(next.values)
                      setTranslationMeta(next.meta)
                      syncScalarFallbacks(next.values)
                    }
                    if (change.address != null) setValue('address', change.address)
                    if (change.city != null) setValue('city', change.city)
                  }}
                />
              </>
            )}

            {(isOnline || selectedFormat === EventFormat.HYBRID) && (
              <FormField
                control={form.control as any}
                name="onlineUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('events.form.onlineUrlLabel', {
                        required: selectedFormat === EventFormat.ONLINE ? '*' : '',
                      })}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://zoom.us/j/123456789" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('events.form.onlineUrlDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Card>

        {/* Дополнительные настройки */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.form.additionalSettings')}</h2>
          <div className="space-y-4">
            <FormField
              control={form.control as any}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.form.maxParticipantsLabel')}</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder={t('events.form.maxParticipantsPlaceholder')}
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>{t('events.form.maxParticipantsDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="registrationOpen"
              render={({ field }) => {
                const isOpen = field.value ?? true
                return (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t('events.form.registrationOpenLabel')}
                      </FormLabel>
                      <FormDescription>
                        {isOpen
                          ? t('events.form.registrationOpenOnDescription')
                          : t('events.form.registrationOpenOffDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={isOpen}
                        onCheckedChange={checked => field.onChange(checked === true)}
                        aria-label={t('events.form.registrationOpenLabel')}
                      />
                    </FormControl>
                  </FormItem>
                )
              }}
            />

            <FormField
              control={form.control as any}
              name="commentsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('events.form.commentsLabel')}</FormLabel>
                    <FormDescription>
                      {t('events.form.commentsDescription')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={checked => field.onChange(checked === true)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </Card>

            {/* Errors */}
            {(updateEvent.isError || errorMessage) && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{errorMessage || t('events.form.updateError')}</p>
              </div>
            )}

            {/* Validation Errors */}
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="rounded-lg border border-warning-soft bg-warning-soft p-4 text-sm text-warning-soft-foreground">
                <p className="font-medium">{t('events.form.fixErrors')}</p>
                <ul className="mt-2 list-inside list-disc">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>
                      {field}: {(error as any)?.message || t('events.form.validationError')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Live preview */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <EventLivePreview control={form.control} />
          </aside>
        </div>
      </form>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.studio.discardEditTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.studio.discardEditDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(`/my-events/${event.id}`)}>
              {t('events.studio.discardEditConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  )
}

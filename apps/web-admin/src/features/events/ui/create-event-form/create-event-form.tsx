import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { AlertCircle, Loader2 } from 'lucide-react'

import {
  ACCESS_TYPE_LABEL_KEYS,
  AccessType,
  CURRENCY_LABEL_KEYS,
  CURRENCY_OPTIONS,
  EVENT_FORMAT_LABEL_KEYS,
  EVENT_TYPE_LABEL_KEYS,
  EventFormat,
  EventType,
} from '@entities/event'
import {
  useCreateEvent,
  useSuggestEventSlug,
  useCheckEventSlug,
} from '@features/events/api'
import { useCreateEventForm } from '@features/events/lib/use-create-event-form'
import { EventLocationPicker } from '@features/events/ui/event-location-picker'
import { EventMediaUpload } from '@features/events/ui/event-media-upload'
import { cn } from '@shared/lib/cn'
import { useDebounce } from '@shared/lib/use-debounce'
import { SLUG_VALID_REGEX, SLUG_MAX_LENGTH, toISO8601Z } from '@shared/lib'
import {
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
  RichTextEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shared/ui'

import type { CreateEventFormValues } from '@features/events/lib/schemas/create-event-schema'

export function CreateEventForm() {
  const t = useT()
  const navigate = useNavigate()
  const form = useCreateEventForm()
  const createEvent = useCreateEvent()
  const [errorMessage, setErrorMessage] = React.useState<string>('')

  const selectedType = form.watch('type')
  const selectedFormat = form.watch('format')
  const title = form.watch('title')
  const slug = form.watch('slug')
  const debouncedTitle = useDebounce(title, 400)
  const debouncedSlug = useDebounce(slug, 400)
  const suggestSlug = useSuggestEventSlug(debouncedTitle)
  const slugCheck = useCheckEventSlug(debouncedSlug)
  const lastSuggestedSlugRef = React.useRef<string>('')

  const isPaid = selectedType === EventType.PAID
  const isOnline = selectedFormat === EventFormat.ONLINE
  const isOffline = selectedFormat === EventFormat.OFFLINE || selectedFormat === EventFormat.HYBRID

  // Очищаем price при переключении на бесплатный тип
  const { setValue } = form
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

  const onSubmit = async (data: CreateEventFormValues): Promise<void> => {
    try {
      setErrorMessage('') // Очищаем предыдущую ошибку

      // Трансформируем данные формы в формат API
      const { eventMedia, speakers, agenda, customQuestions, ...restData } = data

      // Определяем coverImage на основе eventMedia
      let coverImage: string | undefined
      if (eventMedia?.type === 'file' && eventMedia.url) {
        coverImage = eventMedia.url
      } else if (eventMedia?.type === 'template' && eventMedia.template) {
        // Для шаблона отправляем имя шаблона — бэкенд может его обработать
        // или это будет просто идентификатор градиента
        coverImage = `template:${eventMedia.template}`
      }

      // Backend ожидает description как массив блоков напрямую
      const description = restData.description

      const slugTrim = restData.slug?.trim()
      // Даты в ISO 8601 с Z (бэкенд требует явную таймзону)
      const requestData: any = {
        title: restData.title,
        ...(slugTrim ? { slug: slugTrim } : {}),
        description,
        shortDescription: restData.shortDescription,
        coverImage,
        type: restData.type,
        accessType: restData.accessType,
        format: restData.format,
        startDate: toISO8601Z(restData.startDate),
        endDate: toISO8601Z(restData.endDate),
        registrationDeadline: toISO8601Z(restData.registrationDeadline),
        venue: restData.venue,
        address: restData.address,
        city: restData.city,
        latitude: restData.latitude ?? undefined,
        longitude: restData.longitude ?? undefined,
        placeId: restData.placeId ?? undefined,
        onlineUrl: restData.onlineUrl,
        price: restData.price !== undefined ? Number(restData.price) : undefined,
        currency: restData.currency,
        maxParticipants:
          restData.maxParticipants !== undefined ? Number(restData.maxParticipants) : undefined,
        commentsEnabled: restData.commentsEnabled,
      }

      // Убираем undefined поля
      Object.keys(requestData).forEach(key => {
        if (requestData[key] === undefined || requestData[key] === '') {
          delete requestData[key]
        }
      })

      const result = await createEvent.mutateAsync(requestData)
      navigate(`/my-events/${result.id}`)
    } catch (error: any) {
      // Ошибка уже нормализована в api interceptor (config.ts)
      // Структура: { message, status, isNetworkError, details }
      const message = error?.message || t('events.batch1.createEventForm.s001')
      setErrorMessage(message)
      console.error('Failed to create event:', error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Основная информация */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.batch1.createEventForm.s002')}</h2>
          <div className="space-y-4">
            <FormField
              control={form.control as any}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.createEventForm.s003')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('events.batch1.createEventForm.s004')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL (slug)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('events.batch1.createEventForm.s005')}
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
                  <FormDescription>{t('events.batch1.createEventForm.s006')}</FormDescription>
                  {field.value?.trim() &&
                    SLUG_VALID_REGEX.test(field.value.trim().toLowerCase()) &&
                    debouncedSlug.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {slugCheck.isFetching && t('events.batch1.createEventForm.s007')}
                        {slugCheck.isFetched &&
                          slugCheck.data &&
                          (slugCheck.data.available ? t('events.batch1.createEventForm.s008') : t('events.batch1.createEventForm.s009'))}
                      </p>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.createEventForm.s010')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('events.batch1.createEventForm.s011')}
                      className="min-h-20 resize-none"
                      maxLength={300}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('events.batch1.createEventForm.s012')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.createEventForm.s013')}</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('events.batch1.createEventForm.s014')}
                    />
                  </FormControl>
                  <FormDescription>{t('events.batch1.createEventForm.s015')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="eventMedia"
              render={({ field }) => (
                <EventMediaUpload value={field.value} onChange={field.onChange} />
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
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = e.target.value
                          field.onChange(val === '' ? undefined : Number(val))
                        }}
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
                            {t(CURRENCY_LABEL_KEYS[currency])}
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
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.batch1.createEventForm.s016')}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control as any}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.createEventForm.s017')}</FormLabel>
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
                    <FormLabel>{t('events.batch1.createEventForm.s018')}</FormLabel>
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

            <FormField
              control={form.control as any}
              name="registrationDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.createEventForm.s019')}</FormLabel>
                  <FormControl>
                    <DateTimeInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      id="registrationDeadline"
                    />
                  </FormControl>
                  <FormDescription>{t('events.batch1.createEventForm.s020')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Локация */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.batch1.createEventForm.s021')}</h2>
          <div className="space-y-4">
            {isOffline && (
              <>
                <FormField
                  control={form.control as any}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.batch1.createEventForm.s022')}{isOffline ? '*' : ''}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('events.batch1.createEventForm.s023')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.batch1.createEventForm.s024')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('events.batch1.createEventForm.s025')} {...field} />
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
                      <FormLabel>{t('events.batch1.createEventForm.s026')}</FormLabel>
                      <FormControl>
                        <CitySelect
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('events.batch1.createEventForm.s027')}
                        />
                      </FormControl>
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
                    if (change.venue != null) setValue('venue', change.venue)
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
                    <FormLabel>{t('events.batch1.createEventForm.s028')}{selectedFormat === EventFormat.ONLINE ? '*' : ''}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://zoom.us/j/123456789" {...field} />
                    </FormControl>
                    <FormDescription>{t('events.batch1.createEventForm.s029')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Card>

        {/* Дополнительные настройки */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('events.batch1.createEventForm.s030')}</h2>
          <div className="space-y-4">
            <FormField
              control={form.control as any}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.createEventForm.s031')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t('events.batch1.createEventForm.s032')}
                      {...field}
                      onChange={e =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription>{t('events.batch1.createEventForm.s033')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="commentsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('events.batch1.createEventForm.s034')}</FormLabel>
                    <FormDescription>{t('events.batch1.createEventForm.s035')}</FormDescription>
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
        {(createEvent.isError || errorMessage) && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-danger-soft p-4 text-sm text-danger-soft-foreground">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{errorMessage || t('events.batch1.createEventForm.s001')}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/my-events')}>{t('events.batch1.createEventForm.s036')}</Button>
          <Button type="submit" disabled={createEvent.isPending}>
            {createEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('events.batch1.createEventForm.s037')}</Button>
        </div>
      </form>
    </Form>
  )
}

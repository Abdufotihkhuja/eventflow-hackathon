import { useMemo, useState } from 'react'
import { formatDate } from '@eventflow/i18n'
import {
  Plus,
  Trash2,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Presentation,
  Coffee,
  Handshake,
  Mic2,
  GraduationCap,
  Users,
  GripVertical,
  User,
  DoorOpen,
  DoorClosed,
  ClipboardList,
  Lightbulb,
  MessagesSquare,
  Laptop,
} from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@eventflow/i18n/react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Separator,
  Textarea,
  Checkbox,
  TimeInput,
  DurationInput,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { formatUserName, parseCalendarDate } from '@shared/lib'
import {
  useAgendaQuery,
  useCreateAgendaItem,
  useUpdateAgendaItem,
  useDeleteAgendaItem,
  useReorderAgenda,
} from '@features/events/api/use-agenda'
import { useEventRoomsQuery } from '@features/events/api/use-event-rooms'
import { EventRoomsManager } from '@features/events/ui/event-rooms-manager/event-rooms-manager'
import type { AgendaItem, AgendaItemType } from '@api/services/agenda.types'
import type { EventRoom } from '@api/services/eventRooms.types'
import {
  groupByOverlap,
  formatMinutes,
  normalizeLocation,
  startMinutesOf,
  endMinutesOf,
} from '@features/events/lib/agenda-overlap'
import { MaterialsManager } from './materials-manager'
import { resolveLocalizedField } from '@entities/event'
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type TranslationApplyMode,
} from '@features/translations'

// location больше не локализуется через translations — он становится snapshot
// от EventRoom.name (зал — отдельная сущность с собственными translations).
const AGENDA_TRANSLATION_FIELD_KEYS = ['title', 'description'] as const
const AGENDA_BUSINESS_LOCALES: readonly AppLocale[] = ['ru', 'uz', 'en']

// Defensive fallback для parallel-session UI: ключи есть в i18n src, но в dev
// под Vite/Docker иногда не подхватываются → показываем «[missing translation: ...]».
// Этот словарь делает UI устойчивым к stale-кэшу.
type ParallelLabels = { badge: string; trackLabel: string; aria: (range: string) => string }
const PARALLEL_LABELS_BY_LOCALE: Record<'ru' | 'uz' | 'en', ParallelLabels> = {
  ru: {
    badge: 'Параллельная сессия',
    trackLabel: 'Зал',
    aria: range => `Параллельные сессии ${range}`,
  },
  uz: {
    badge: 'Parallel sessiya',
    trackLabel: 'Zal',
    aria: range => `Parallel sessiyalar ${range}`,
  },
  en: {
    badge: 'Parallel session',
    trackLabel: 'Track',
    aria: range => `Parallel sessions ${range}`,
  },
}
function getParallelLabels(locale: string): ParallelLabels {
  return PARALLEL_LABELS_BY_LOCALE[locale === 'uz' || locale === 'en' ? locale : 'ru']
}

const AGENDA_ERROR_CODE_KEYS: Record<string, string> = {
  AGENDA_TIME_INVALID: 'events.agenda.validation.timeInvalid',
  AGENDA_PARALLEL_LIMIT_EXCEEDED: 'events.agenda.validation.parallelLimit',
  AGENDA_ROOM_TIME_CONFLICT: 'events.agenda.validation.roomConflict',
  AGENDA_ROOM_REQUIRED_FOR_PARALLEL: 'events.agenda.validation.roomRequired',
  AGENDA_EVENT_NOT_FOUND: 'events.agenda.validation.eventNotFound',
  AGENDA_ITEM_NOT_FOUND: 'events.agenda.validation.itemNotFound',
}

type AgendaManagerProps = {
  eventId: string
  startDate: string
  endDate: string
  speakers?: Array<{ id: string; firstName: string; lastName: string }>
}

type LocalAgendaItem = AgendaItem & {
  isNew?: boolean
  isEditing?: boolean
}

/**
 * Получить список дней между startDate и endDate (включительно)
 * Извлекает только даты (YYYY-MM-DD), игнорируя время
 */
function getEventDays(startDate: string, endDate: string): string[] {
  // Извлекаем только дату (YYYY-MM-DD) из ISO datetime
  const startDateOnly = extractDateFromISO(startDate)
  const endDateOnly = extractDateFromISO(endDate)

  // Создаём Date объекты из строк YYYY-MM-DD
  const start = new Date(startDateOnly + 'T00:00:00')
  const end = new Date(endDateOnly + 'T00:00:00')
  const days: string[] = []

  const current = new Date(start)
  while (current <= end) {
    // Форматируем в YYYY-MM-DD
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    days.push(`${year}-${month}-${day}`)

    current.setDate(current.getDate() + 1)
  }

  return days
}

/**
 * Форматировать календарную дату YYYY-MM-DD для отображения (например: "20 января").
 */
function formatEventDay(dateStr: string, locale: string): string {
  return formatDate(parseCalendarDate(dateStr), locale, {
    day: 'numeric',
    month: 'long',
  })
}

// Лейблы и иконки типов программы
const AGENDA_TYPE_CONFIG: Record<
  AgendaItemType,
  { labelKey: string; icon: typeof Mic2; color: string; bgColor: string }
> = {
  KEYNOTE: {
    labelKey: 'events.agenda.type.keynote',
    icon: Mic2,
    color: 'text-primary',
    bgColor: 'bg-brand-soft',
  },
  PRESENTATION: {
    labelKey: 'events.agenda.type.presentation',
    icon: Presentation,
    color: 'text-info',
    bgColor: 'bg-info-soft',
  },
  WORKSHOP: {
    labelKey: 'events.agenda.type.workshop',
    icon: GraduationCap,
    color: 'text-success',
    bgColor: 'bg-success-soft',
  },
  PANEL: {
    labelKey: 'events.agenda.type.panel',
    icon: Users,
    color: 'text-info',
    bgColor: 'bg-info-soft',
  },
  NETWORKING: {
    labelKey: 'events.agenda.type.networking',
    icon: Handshake,
    color: 'text-warning',
    bgColor: 'bg-warning-soft',
  },
  BREAK: {
    labelKey: 'events.agenda.type.break',
    icon: Coffee,
    color: 'text-muted-foreground dark:text-muted-foreground',
    bgColor: 'bg-neutral-soft',
  },
  OPENING: {
    labelKey: 'events.agenda.type.opening',
    icon: DoorOpen,
    color: 'text-success',
    bgColor: 'bg-success-soft',
  },
  CLOSING: {
    labelKey: 'events.agenda.type.closing',
    icon: DoorClosed,
    color: 'text-destructive',
    bgColor: 'bg-danger-soft',
  },
  REGISTRATION: {
    labelKey: 'events.agenda.type.registration',
    icon: ClipboardList,
    color: 'text-info',
    bgColor: 'bg-info-soft',
  },
  MENTORSHIP: {
    labelKey: 'events.agenda.type.mentorship',
    icon: Lightbulb,
    color: 'text-warning',
    bgColor: 'bg-warning-soft',
  },
  MENTOR_SESSION: {
    labelKey: 'events.agenda.type.mentorSession',
    icon: MessagesSquare,
    color: 'text-success',
    bgColor: 'bg-success-soft',
  },
  FREE_WORK: {
    labelKey: 'events.agenda.type.freeWork',
    icon: Laptop,
    color: 'text-foreground',
    bgColor: 'bg-muted',
  },
}

// Извлекает дату в формате YYYY-MM-DD из ISO datetime
function extractDateFromISO(isoDateTime: string): string {
  try {
    const date = new Date(isoDateTime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

/** Извлекает HH:MM из ISO datetime при получении от API */
function extractTimeFromISO(isoDateTime: string): string {
  try {
    const date = new Date(isoDateTime)
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  } catch {
    return '09:00'
  }
}

/** Вычисляет время окончания из HH:MM и длительности */
function addMinutesToTime(timeHHMM: string, duration: number): string {
  const [h, m] = timeHHMM.split(':').map(Number)
  let totalMins = h * 60 + m + duration
  totalMins = ((totalMins % 1440) + 1440) % 1440
  const newH = Math.floor(totalMins / 60)
  const newM = totalMins % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

// Sortable Item Component
function SortableAgendaItem({
  item,
  isEditing,
  expandedItem,
  speakers,
  eventDays,
  rooms,
  isParallel = false,
  collidingItems = [],
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onUpdateField,
  onOpenRoomsManager,
  isSaving,
  isDeleting,
}: {
  item: LocalAgendaItem
  isEditing: boolean
  expandedItem: string | null
  speakers: Array<{ id: string; firstName: string; lastName: string }>
  eventDays: string[]
  rooms: EventRoom[]
  isParallel?: boolean
  collidingItems?: LocalAgendaItem[]
  onToggleExpand: (id: string) => void
  onStartEdit: (item: LocalAgendaItem) => void
  onCancelEdit: (id: string) => void
  onSave: (item: LocalAgendaItem) => void
  onDelete: (id: string) => void
  onUpdateField: <K extends keyof LocalAgendaItem>(
    id: string,
    field: K,
    value: LocalAgendaItem[K]
  ) => void
  onOpenRoomsManager: () => void
  isSaving: boolean
  isDeleting: boolean
}) {
  const { locale, t } = useI18n()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [translationLocale, setTranslationLocale] = useState<AppLocale>('ru')
  const translateBatch = useTranslateBatch()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isEditing,
  })

  // Локализованные поля title/description: source of truth — item.translations,
  // scalar поля на item остаются как fallback (используются в backend для mail, search,
  // legacy clients) и пересчитываются на каждый ввод. location управляется через
  // EventRoom (FK), а не через translations.
  const translationValues = createBusinessTranslationValues(
    AGENDA_TRANSLATION_FIELD_KEYS,
    item.translations,
    {
      title: item.title,
      description: item.description ?? '',
    },
  )
  const translationMeta = createBusinessTranslationMeta(
    AGENDA_TRANSLATION_FIELD_KEYS,
    item.translationMeta,
    translationValues,
  )
  const translationFields: BusinessTranslationFieldConfig[] = [
    {
      key: 'title',
      label: t('events.agenda.manager.titleLabel'),
      placeholder: t('events.agenda.manager.titlePlaceholder'),
      maxLength: 300,
    },
    {
      key: 'description',
      label: t('events.agenda.manager.descriptionLabel'),
      placeholder: t('events.agenda.manager.descriptionPlaceholder'),
      maxLength: 2000,
      multiline: true,
      rows: 3,
    },
  ]
  const handleTranslationChange = (
    fieldKey: string,
    targetLocale: AppLocale,
    value: string,
  ) => {
    const next = setBusinessTranslationValue(
      translationValues,
      translationMeta,
      fieldKey,
      targetLocale,
      value,
    )
    onUpdateField(
      item.id,
      'translations',
      next.values as unknown as LocalAgendaItem['translations'],
    )
    onUpdateField(
      item.id,
      'translationMeta',
      next.meta as unknown as LocalAgendaItem['translationMeta'],
    )
    // Scalar = первая непустая локаль (ru → uz → en) для обратной совместимости.
    const localized = next.values[fieldKey]
    const scalar =
      localized.ru?.trim() || localized.uz?.trim() || localized.en?.trim() || ''
    if (fieldKey === 'title') {
      onUpdateField(item.id, 'title', scalar)
    } else if (fieldKey === 'description') {
      onUpdateField(item.id, 'description', scalar.length > 0 ? scalar : null)
    }
  }

  const sourceLocaleForTranslate = resolveBusinessSourceLocale(
    translationValues,
    AGENDA_TRANSLATION_FIELD_KEYS,
    translationLocale,
  )

  const handleAutoTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocaleForTranslate) {
      toast.error(t('common.translations.addTextBeforeTranslating'))
      return
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      AGENDA_TRANSLATION_FIELD_KEYS,
      sourceLocaleForTranslate,
      mode,
    )
    if (items.length === 0) {
      toast.info(t('common.translations.noEligibleFields'))
      return
    }

    const beforeValues = translationValues
    const beforeMeta = translationMeta
    translateBatch.mutate(
      {
        sourceLocale: sourceLocaleForTranslate,
        targetLocales: AGENDA_BUSINESS_LOCALES.filter(l => l !== sourceLocaleForTranslate),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(beforeValues, beforeMeta, response, {
            mode,
          })
          const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode)
          onUpdateField(
            item.id,
            'translations',
            applied.values as unknown as LocalAgendaItem['translations'],
          )
          onUpdateField(
            item.id,
            'translationMeta',
            applied.meta as unknown as LocalAgendaItem['translationMeta'],
          )
          // Sync scalar fields to first non-empty locale per field for legacy fallback.
          for (const fieldKey of AGENDA_TRANSLATION_FIELD_KEYS) {
            const next = applied.values[fieldKey]
            const scalar =
              next.ru?.trim() || next.uz?.trim() || next.en?.trim() || ''
            if (fieldKey === 'title') {
              onUpdateField(item.id, 'title', scalar)
            } else if (fieldKey === 'description') {
              onUpdateField(item.id, 'description', scalar.length > 0 ? scalar : null)
            }
          }
          toast.success(
            t('common.translations.translatedSummary', summary),
          )
        },
        onError: error => {
          toast.error(error?.message ?? t('common.translations.serviceFailed'))
        },
      },
    )
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const config = AGENDA_TYPE_CONFIG[item.type]
  const Icon = config.icon
  const displayStartTime = item.startTime
  const endTime = addMinutesToTime(item.startTime, item.duration)

  const itemSpeakers = speakers.filter(s => item.speakers.some(is => is.id === s.id))
  const selectedSpeakerIds = item.speakers.map(s => s.id)

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'overflow-hidden transition',
          isEditing && 'ring-2 ring-brand-secondary shadow-lg',
          isDragging && 'opacity-50'
        )}
      >
        {/* Header */}
        <div className="flex items-center">
          {/* Drag Handle */}
          {!isEditing && (
            <button
              type="button"
              className="p-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => !isEditing && onToggleExpand(item.id)}
            disabled={isEditing}
            className={cn(
              'flex w-full items-center justify-between p-4 text-left transition-colors',
              !isEditing && 'hover:bg-muted/50',
              isEditing && 'pl-4'
            )}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Icon & Badge */}
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg shrink-0',
                  config.bgColor
                )}
              >
                <Icon className={cn('h-6 w-6', config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground leading-tight">
                    {resolveLocalizedField(item.translations, 'title', locale, item.title) || (
                      <span className="text-muted-foreground">
                        {t('events.agenda.manager.untitled')}
                      </span>
                    )}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {t(config.labelKey)}
                  </Badge>
                  {(() => {
                    // Приоритет: room.translations.name (per-event EventRoom) →
                    // legacy item.location. Это позволяет локализовать имя зала
                    // через сущность Room вместо устаревшего text-fallback.
                    const localizedRoomName = item.room
                      ? resolveLocalizedField(
                          item.room.translations,
                          'name',
                          locale,
                          item.room.name,
                        )
                      : item.location
                    return isParallel && localizedRoomName ? (
                      <Badge variant="outline" className="text-xs font-medium">
                        {getParallelLabels(locale).trackLabel} · {localizedRoomName}
                      </Badge>
                    ) : null
                  })()}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {displayStartTime} - {endTime}
                  </span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>
                    {item.duration} {t('events.agenda.manager.minuteShort')}
                  </span>
                  {itemSpeakers.length > 0 && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {itemSpeakers.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expand Icon */}
            {!isEditing && (
              <div className="ml-2 shrink-0">
                {expandedItem === item.id ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            )}
          </button>
        </div>

        {/* Expanded Content */}
        {(expandedItem === item.id || isEditing) && (
          <>
            <Separator />
            <div className="p-4 bg-muted/30">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                  {/* Локализуемые поля (название, описание, локация) на ru/uz/en */}
                  <MultilingualTabsField
                    fields={translationFields}
                    values={translationValues}
                    meta={translationMeta}
                    activeLocale={translationLocale}
                    onLocaleChange={setTranslationLocale}
                    onValueChange={handleTranslationChange}
                  />
                  <TranslateFieldsToolbar
                    sourceLocale={sourceLocaleForTranslate}
                    activeLocale={translationLocale}
                    isPending={translateBatch.isPending}
                    disabled={!sourceLocaleForTranslate}
                    onTranslateEmpty={() => handleAutoTranslate('fill_empty')}
                    onUpdateAuto={() => handleAutoTranslate('update_auto')}
                  />

                  {/* Тип */}
                  <div>
                    <Label htmlFor={`type-${item.id}`} className="text-sm font-medium">
                      {t('events.agenda.manager.activityTypeLabel')} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={item.type}
                      onValueChange={value =>
                        onUpdateField(item.id, 'type', value as AgendaItemType)
                      }
                    >
                      <SelectTrigger id={`type-${item.id}`} className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(AGENDA_TYPE_CONFIG).map(([type, conf]) => {
                          const TypeIcon = conf.icon
                          return (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                <TypeIcon className={cn('h-4 w-4', conf.color)} />
                                <span>{t(conf.labelKey)}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* День проведения (для многодневных событий) */}
                  {eventDays.length > 1 && (
                    <div>
                      <Label htmlFor={`date-${item.id}`} className="text-sm font-medium">
                        {t('events.agenda.manager.eventDayLabel')} <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={item.date}
                        onValueChange={value => onUpdateField(item.id, 'date', value)}
                      >
                        <SelectTrigger id={`date-${item.id}`} className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {eventDays.map((day, index) => (
                            <SelectItem key={day} value={day}>
                              {t('events.agenda.manager.dayLabel')} {index + 1} —{' '}
                              {formatEventDay(day, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Время и длительность */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`start-${item.id}`} className="text-sm font-medium">
                        {t('events.agenda.manager.startTimeLabel')} <span className="text-destructive">*</span>
                      </Label>
                      <TimeInput
                        id={`start-${item.id}`}
                        value={item.startTime}
                        onChange={value =>
                          onUpdateField(item.id, 'startTime', value || '09:00')
                        }
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`duration-${item.id}`} className="text-sm font-medium">
                        {t('events.agenda.manager.durationLabel')} <span className="text-destructive">*</span>
                      </Label>
                      <DurationInput
                        id={`duration-${item.id}`}
                        value={item.duration ?? 60}
                        onChange={v => onUpdateField(item.id, 'duration', v)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  {/* Время окончания (вычисляемое) */}
                  {item.startTime && item.duration > 0 && (
                    <div className="rounded-lg border border-border bg-card p-3 text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t('events.agenda.manager.endTimeLabel')}
                      </span>
                      <span className="font-semibold text-foreground">{endTime}</span>
                    </div>
                  )}

                  {/* Зал — выбор из per-event EventRoom списка. Заменяет
                      free-text location: теперь зал — отдельная сущность
                      с собственными translations. Кнопка «Управлять» открывает
                      EventRoomsManager для CRUD залов. */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`room-${item.id}`} className="text-sm font-medium">
                        {t('events.agenda.manager.roomLabel')}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={onOpenRoomsManager}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('events.rooms.actions.manage')}
                      </Button>
                    </div>
                    <Select
                      value={item.roomId ?? '__none__'}
                      onValueChange={value => {
                        const nextRoomId = value === '__none__' ? null : value
                        onUpdateField(item.id, 'roomId', nextRoomId)
                        const nextRoom = nextRoomId
                          ? rooms.find(r => r.id === nextRoomId) ?? null
                          : null
                        onUpdateField(item.id, 'room', nextRoom
                          ? { id: nextRoom.id, name: nextRoom.name, translations: nextRoom.translations ?? null }
                          : null)
                        // Sync legacy scalar location для писем/PDF/поиска.
                        onUpdateField(item.id, 'location', nextRoom?.name ?? null)
                      }}
                    >
                      <SelectTrigger id={`room-${item.id}`}>
                        <SelectValue placeholder={t('events.agenda.manager.roomPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">
                            {t('events.agenda.manager.roomNone')}
                          </span>
                        </SelectItem>
                        {rooms.map(room => (
                          <SelectItem
                            key={room.id}
                            value={room.id}
                            disabled={!room.isActive}
                          >
                            <span className="flex items-center gap-1.5">
                              {resolveLocalizedField(
                                room.translations,
                                'name',
                                locale,
                                room.name,
                              )}
                              {!room.isActive && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({t('events.rooms.tabs.inactive')})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rooms.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t('events.rooms.empty')}
                      </p>
                    )}
                    {collidingItems.length > 0 && (
                      <p
                        role="status"
                        className="text-xs text-warning"
                      >
                        {t('events.agenda.form.locationCollideWarning')}
                      </p>
                    )}
                  </div>

                  {/* Спикеры */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        {t('events.agenda.manager.speakersLabel')}
                      </Label>
                      {speakers.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {t('events.agenda.manager.availableCount', { count: speakers.length })}
                        </span>
                      )}
                    </div>
                    {speakers.length > 0 ? (
                      <>
                        <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3 bg-card">
                          {speakers.map(speaker => (
                            <div key={speaker.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`speaker-${item.id}-${speaker.id}`}
                                checked={selectedSpeakerIds.includes(speaker.id)}
                                onCheckedChange={checked => {
                                  const newSpeakers = checked
                                    ? [
                                        ...item.speakers,
                                        {
                                          id: speaker.id,
                                          firstName: speaker.firstName,
                                          lastName: speaker.lastName,
                                        },
                                      ]
                                    : item.speakers.filter(s => s.id !== speaker.id)
                                  onUpdateField(item.id, 'speakers', newSpeakers)
                                }}
                              />
                              <Label
                                htmlFor={`speaker-${item.id}-${speaker.id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {formatUserName(speaker.firstName, speaker.lastName)}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {selectedSpeakerIds.length > 0 ? (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {t('events.agenda.manager.selectedCount', {
                              count: selectedSpeakerIds.length,
                              total: speakers.length,
                            })}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {t('events.agenda.manager.selectSpeakersHint')}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
                        <User className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">
                          {t('events.speakers.tab.emptyTitle')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {t('events.agenda.manager.emptySpeakersDescription')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Материалы */}
                  <MaterialsManager
                    eventId={item.eventId}
                    agendaItemId={item.isNew ? null : item.id}
                    isReadOnly={false}
                  />

                  {/* Действия */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelEdit(item.id)}
                      disabled={isSaving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('actions.cancel')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onSave(item)}
                      disabled={!item.title.trim() || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('events.agenda.manager.saving')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('actions.save')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-4">
                  {/* Информация */}
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const localizedDescription = resolveLocalizedField(
                        item.translations,
                        'description',
                        locale,
                        item.description,
                      )
                      return localizedDescription ? (
                        <div>
                          <span className="font-medium text-foreground">
                            {t('events.agenda.manager.descriptionValueLabel')}
                          </span>
                          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                            {localizedDescription}
                          </p>
                        </div>
                      ) : null
                    })()}
                    {(() => {
                      const localizedRoomName = item.room
                        ? resolveLocalizedField(
                            item.room.translations,
                            'name',
                            locale,
                            item.room.name,
                          )
                        : item.location
                      return localizedRoomName ? (
                        <div>
                          <span className="font-medium text-foreground">
                            {t('events.agenda.manager.locationValueLabel')}
                          </span>
                          <span className="text-muted-foreground ml-2">{localizedRoomName}</span>
                        </div>
                      ) : null
                    })()}
                    {itemSpeakers.length > 0 && (
                      <div>
                        <span className="font-medium text-foreground">
                          {t('events.agenda.manager.speakersValueLabel')}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {itemSpeakers.map(s => (
                            <Badge key={s.id} variant="outline" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {formatUserName(s.firstName, s.lastName)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Материалы */}
                  <MaterialsManager
                    eventId={item.eventId}
                    agendaItemId={item.id}
                    isReadOnly={true}
                  />

                  {/* Действия */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onStartEdit(item)}
                    >
                      {t('actions.edit')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive hover:bg-red-500/10"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('events.agenda.manager.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('events.agenda.manager.deleteDescription', { title: item.title })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                          {t('actions.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDelete(item.id)}
                        >
                          {t('actions.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export function AgendaManager({ eventId, startDate, endDate, speakers = [] }: AgendaManagerProps) {
  const { locale, t } = useI18n()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [editingItems, setEditingItems] = useState<Record<string, LocalAgendaItem>>({})
  const [roomsManagerOpen, setRoomsManagerOpen] = useState(false)
  // null = «Все залы», строка = конкретный roomId
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string | null>(null)

  const { data, isLoading, error } = useAgendaQuery(eventId)
  const roomsQuery = useEventRoomsQuery(eventId)
  const createMutation = useCreateAgendaItem(eventId)
  const updateMutation = useUpdateAgendaItem(eventId)
  const deleteMutation = useDeleteAgendaItem(eventId)
  const reorderMutation = useReorderAgenda(eventId)

  const rooms = useMemo(() => {
    const list = roomsQuery.data ?? []
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [roomsQuery.data])
  const activeRooms = useMemo(() => rooms.filter(r => r.isActive), [rooms])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // API возвращает ISO — нормализуем в YYYY-MM-DD и HH:MM для внутреннего состояния
  const agendaItems = (data ?? []).map(item => ({
    ...item,
    date: extractDateFromISO(item.date),
    startTime: extractTimeFromISO(item.startTime),
    speakers: item.speakers.map(s => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
    })),
  }))

  // Вычисляем список дней события для многодневных событий
  const eventDays = getEventDays(startDate, endDate)

  const addNewItem = () => {
    const newId = `new-${Date.now()}`
    const nextSortOrder = Math.max(0, ...agendaItems.map(item => item.sortOrder)) + 1

    // По умолчанию выбираем первый день события
    const defaultDate = eventDays[0]

    const newItem: LocalAgendaItem = {
      id: newId,
      eventId,
      date: defaultDate,
      title: '',
      description: null,
      type: 'PRESENTATION',
      startTime: '09:00',
      duration: 60,
      location: null,
      roomId: null,
      room: null,
      materials: [],
      sortOrder: nextSortOrder,
      speakers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isNew: true,
      isEditing: true,
    }

    setEditingItems(prev => ({ ...prev, [newId]: newItem }))
    setExpandedItem(newId)
  }

  const startEditing = (item: LocalAgendaItem) => {
    setEditingItems(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        speakers: [...item.speakers],
        isEditing: true,
      },
    }))
    setExpandedItem(item.id)
  }

  const cancelEditing = (itemId: string) => {
    setEditingItems(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setExpandedItem(null)
  }

  const saveItem = async (item: LocalAgendaItem) => {
    // Валидация
    if (!item.title.trim()) {
      toast.error(t('events.agenda.validation.titleRequired'))
      return
    }

    if (item.duration < 1) {
      toast.error(t('events.agenda.validation.durationMin'))
      return
    }

    // Payload: date и time уже в нужном формате (YYYY-MM-DD, HH:MM).
    // КРИТИЧНО: translations + translationMeta должны улетать на бэк, иначе
    // авто-перевод и ручные правки в UZ/EN потеряются после сохранения.
    const payload = {
      date: item.date,
      title: item.title.trim(),
      type: item.type,
      startTime: item.startTime,
      duration: item.duration,
      sortOrder: item.sortOrder,
      ...(item.description && { description: item.description }),
      ...(item.location && { location: item.location }),
      // FK на EventRoom (per-event зал). При наличии — backend синхронизирует
      // location = room.name и валидирует конфликты по roomId.
      ...(item.roomId !== undefined && { roomId: item.roomId }),
      // materials теперь управляются через отдельный API (agendaMaterialsService)
      ...(item.speakers &&
        item.speakers.length > 0 && { speakerIds: item.speakers.map(s => s.id) }),
      ...(item.translations && {
        translations: item.translations as Record<
          string,
          Partial<Record<'ru' | 'uz' | 'en', string>>
        >,
      }),
      ...(item.translationMeta && {
        translationMeta: item.translationMeta as Record<
          string,
          Record<'ru' | 'uz' | 'en', Record<string, unknown>>
        >,
      }),
    }

    try {
      if (item.isNew) {
        await createMutation.mutateAsync(payload)
        toast.success(t('events.agenda.toasts.itemCreated'))
      } else {
        await updateMutation.mutateAsync({ itemId: item.id, data: payload })
        toast.success(t('events.agenda.toasts.itemUpdated'))
      }
      cancelEditing(item.id)
    } catch (err: unknown) {
      // ApiError уже нормализован в apiClient (normalizeApiError);
      // у нас в `details` лежит response body фильтра — { code, message, details, errors }
      const error = err as {
        message?: string
        details?: {
          code?: string
          message?: string | string[]
          details?: { prismaMessage?: string }
          errors?: Record<string, string[]>
        }
      }

      const code = error.details?.code
      const i18nKey = code ? AGENDA_ERROR_CODE_KEYS[code] : undefined

      if (i18nKey) {
        toast.error(t(i18nKey))
        return
      }

      const detailsMessage = error.details?.message
      const prismaMessage = error.details?.details?.prismaMessage
      // В dev режиме всегда полезно видеть полный Prisma-дамп, чтобы быстрее
      // диагностировать рассинхрон полей; toast.error поддерживает description.
      if (Array.isArray(detailsMessage)) {
        detailsMessage.forEach(msg => toast.error(msg))
      } else if (typeof detailsMessage === 'string' && detailsMessage) {
        toast.error(detailsMessage, {
          description: prismaMessage,
          duration: prismaMessage ? 15000 : undefined,
        })
      } else if (error.message) {
        toast.error(error.message, {
          description: prismaMessage,
          duration: prismaMessage ? 15000 : undefined,
        })
      } else {
        toast.error(t('events.agenda.toasts.itemSaveError'))
      }

      if (prismaMessage) {
        // eslint-disable-next-line no-console
        console.error('[agenda] Prisma validation error:', prismaMessage)
      }
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      await deleteMutation.mutateAsync(itemId)
      toast.success(t('events.agenda.toasts.itemDeleted'))
    } catch (err) {
      toast.error(t('events.agenda.toasts.itemDeleteError'))
      console.error('Failed to delete agenda item:', err)
    }
  }

  const updateEditingItem = <K extends keyof LocalAgendaItem>(
    itemId: string,
    field: K,
    value: LocalAgendaItem[K]
  ) => {
    setEditingItems(prev => {
      if (!prev[itemId]) return prev
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: value,
        },
      }
    })
  }

  const toggleExpand = (itemId: string) => {
    // Если элемент уже раскрыт - закрываем, иначе - открываем
    setExpandedItem(prev => (prev === itemId ? null : itemId))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = allItems.findIndex(item => item.id === active.id)
    const newIndex = allItems.findIndex(item => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(allItems, oldIndex, newIndex)
    const itemIds = newOrder.map(item => item.id)

    try {
      await reorderMutation.mutateAsync(itemIds)
      toast.success(t('events.agenda.toasts.orderUpdated'))
    } catch (err) {
      toast.error(t('events.agenda.toasts.orderUpdateError'))
      console.error('Failed to reorder:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
          <p className="text-sm text-muted-foreground">{t('events.agenda.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">{t('events.agenda.manager.loadErrorTitle')}</p>
          <p className="text-xs text-destructive dark:text-red-400 mt-1">
            {t('events.agenda.manager.loadErrorDescription')}
          </p>
        </div>
      </div>
    )
  }

  const allItems = [
    ...agendaItems.filter(item => !editingItems[item.id]),
    ...Object.values(editingItems),
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
    return a.sortOrder - b.sortOrder
  })

  // Фильтр по выбранному залу. null = «Все залы». Применяется на уровне
  // отображения (allItems остаётся целым для drag&drop и валидации).
  const filteredItems = selectedRoomFilter
    ? allItems.filter(item => item.roomId === selectedRoomFilter)
    : allItems

  // Группируем элементы по дням и внутри дня по пересекающимся временным слотам
  const itemsByDay = eventDays.map(day => {
    const dayItems = filteredItems.filter(item => item.date === day)
    return {
      date: day,
      slots: groupByOverlap(dayItems as AgendaItem[]) as Array<{
        startMin: number
        endMin: number
        items: LocalAgendaItem[]
      }>,
    }
  })

  const collidingItemsFor = (item: LocalAgendaItem): LocalAgendaItem[] => {
    const myStart = startMinutesOf(item)
    const myEnd = endMinutesOf(item)
    // Если у item есть roomId — ищем коллизии по FK. Иначе fallback на text-match
    // для legacy-данных (items без привязки к залу).
    return allItems.filter(other => {
      if (other.id === item.id) return false
      if (other.date !== item.date) return false
      const sameRoom = item.roomId
        ? other.roomId === item.roomId
        : !other.roomId &&
          normalizeLocation(other.location) === normalizeLocation(item.location)
      if (!sameRoom) return false
      const oStart = startMinutesOf(other)
      const oEnd = endMinutesOf(other)
      return myStart < oEnd && oStart < myEnd
    })
  }

  // Все элементы доступны для drag & drop
  const sortableItems = allItems

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('events.tabs.agenda')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('events.agenda.manager.headerDescription')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRoomsManagerOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('events.rooms.actions.manage')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={addNewItem}
            disabled={createMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('events.agenda.manager.addItem')}
          </Button>
        </div>
      </div>

      {/* Фильтр по залам — single-select tabs. Скрывается, если залов 0–1. */}
      {activeRooms.length >= 2 && (
        <Tabs
          value={selectedRoomFilter ?? '__all__'}
          onValueChange={value =>
            setSelectedRoomFilter(value === '__all__' ? null : value)
          }
        >
          <TabsList className="flex flex-wrap gap-1 bg-muted/40">
            <TabsTrigger value="__all__">
              {t('events.rooms.tabs.all')}
            </TabsTrigger>
            {activeRooms.map(room => (
              <TabsTrigger key={room.id} value={room.id}>
                {resolveLocalizedField(
                  room.translations,
                  'name',
                  locale,
                  room.name,
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Управление залами */}
      <EventRoomsManager
        eventId={eventId}
        open={roomsManagerOpen}
        onOpenChange={setRoomsManagerOpen}
      />

      {/* Empty State */}
      {allItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Calendar className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <p className="mt-4 text-base font-medium text-foreground">
            {t('events.agenda.manager.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('events.agenda.manager.emptyDescription')}
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addNewItem}>
            <Plus className="mr-2 h-4 w-4" />
            {t('events.agenda.manager.addFirstItem')}
          </Button>
        </Card>
      ) : (
        /* Agenda Items with Drag & Drop */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortableItems.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {itemsByDay.map((dayGroup, index) => (
                <div key={dayGroup.date}>
                  {/* Заголовок дня (показываем только для многодневных событий) */}
                  {eventDays.length > 1 && (
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg bg-brand-secondary/10 px-3 py-2">
                        <Calendar className="h-4 w-4 text-brand-secondary" />
                        <h4 className="text-sm font-semibold text-foreground">
                          {t('events.agenda.manager.dayLabel')} {index + 1} —{' '}
                          {formatEventDay(dayGroup.date, locale)}
                        </h4>
                      </div>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* Элементы программы дня (по временным слотам) */}
                  <div className="space-y-3">
                    {dayGroup.slots.length === 0 ? (
                      <Card className="border-dashed p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          {t('events.agenda.manager.emptyDay')}
                        </p>
                      </Card>
                    ) : (
                      dayGroup.slots.map(slot => {
                        const isParallel = slot.items.length > 1
                        const range = `${formatMinutes(slot.startMin)} – ${formatMinutes(slot.endMin)}`
                        const renderCard = (item: LocalAgendaItem) => (
                          <SortableAgendaItem
                            key={item.id}
                            item={item}
                            isEditing={editingItems[item.id]?.isEditing ?? false}
                            expandedItem={expandedItem}
                            speakers={speakers}
                            eventDays={eventDays}
                            rooms={rooms}
                            isParallel={isParallel}
                            collidingItems={collidingItemsFor(item)}
                            onToggleExpand={toggleExpand}
                            onStartEdit={startEditing}
                            onCancelEdit={cancelEditing}
                            onSave={saveItem}
                            onDelete={deleteItem}
                            onUpdateField={updateEditingItem}
                            onOpenRoomsManager={() => setRoomsManagerOpen(true)}
                            isSaving={createMutation.isPending || updateMutation.isPending}
                            isDeleting={deleteMutation.isPending}
                          />
                        )
                        if (!isParallel) {
                          return <div key={slot.items[0]!.id}>{renderCard(slot.items[0]!)}</div>
                        }
                        const slotKey = slot.items.map(i => i.id).join('|')
                        const colsClass =
                          slot.items.length >= 3
                            ? 'lg:grid-cols-3'
                            : 'lg:grid-cols-2'
                        return (
                          <section
                            key={slotKey}
                            role="group"
                            aria-label={getParallelLabels(locale).aria(range)}
                            className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4"
                          >
                            <header className="mb-3 flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1.5 text-xs font-medium"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                {range}
                              </Badge>
                              <Badge variant="outline" className="text-xs font-medium">
                                {getParallelLabels(locale).badge}
                              </Badge>
                            </header>
                            <div className={cn('grid gap-3', 'grid-cols-1 md:grid-cols-2', colsClass)}>
                              {slot.items.map(item => (
                                <article key={item.id}>{renderCard(item)}</article>
                              ))}
                            </div>
                          </section>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

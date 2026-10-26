import { useState } from 'react'
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
import type { AgendaItem, AgendaItemType } from '@api/services/agenda.types'
import {
  groupByOverlap,
  formatMinutes,
  normalizeLocation,
  startMinutesOf,
  endMinutesOf,
} from '@features/events/lib/agenda-overlap'
import { MaterialsManager } from './materials-manager'
import { useLocale, useT } from '@eventflow/i18n/react'

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
  return parseCalendarDate(dateStr).toLocaleDateString(locale, {
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
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  PRESENTATION: {
    labelKey: 'events.agenda.type.presentation',
    icon: Presentation,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  WORKSHOP: {
    labelKey: 'events.agenda.type.workshop',
    icon: GraduationCap,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  PANEL: {
    labelKey: 'events.agenda.type.panel',
    icon: Users,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  NETWORKING: {
    labelKey: 'events.agenda.type.networking',
    icon: Handshake,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  BREAK: {
    labelKey: 'events.agenda.type.break',
    icon: Coffee,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  OPENING: {
    labelKey: 'events.agenda.type.opening',
    icon: DoorOpen,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  CLOSING: {
    labelKey: 'events.agenda.type.closing',
    icon: DoorClosed,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  REGISTRATION: {
    labelKey: 'events.agenda.type.registration',
    icon: ClipboardList,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  MENTORSHIP: {
    labelKey: 'events.agenda.type.mentorship',
    icon: Lightbulb,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  MENTOR_SESSION: {
    labelKey: 'events.agenda.type.mentorSession',
    icon: MessagesSquare,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
  },
  FREE_WORK: {
    labelKey: 'events.agenda.type.freeWork',
    icon: Laptop,
    color: 'text-brand-soft-foreground',
    bgColor: 'bg-brand-soft',
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
  isParallel = false,
  knownLocations = [],
  collidingItems = [],
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onUpdateField,
  isSaving,
  isDeleting,
}: {
  item: LocalAgendaItem
  isEditing: boolean
  expandedItem: string | null
  speakers: Array<{ id: string; firstName: string; lastName: string }>
  eventDays: string[]
  isParallel?: boolean
  knownLocations?: string[]
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
  isSaving: boolean
  isDeleting: boolean
}) {
  const t = useT()
  const locale = useLocale()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isEditing,
  })

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
                    {item.title || <span className="text-muted-foreground">{t('events.batch1.agendaManager.s001')}</span>}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {t(config.labelKey)}
                  </Badge>
                  {isParallel && item.location && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {t('events.agenda.parallel.trackLabel')} · {item.location}
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {displayStartTime} - {endTime}
                  </span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{item.duration}{t('events.batch1.agendaManager.s002')}</span>
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
                  {/* Название */}
                  <div>
                    <Label htmlFor={`title-${item.id}`} className="text-sm font-medium">{t('events.batch1.agendaManager.s003')}<span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`title-${item.id}`}
                      value={item.title}
                      onChange={e => onUpdateField(item.id, 'title', e.target.value)}
                      placeholder={t('events.batch1.agendaManager.s004')}
                      className="mt-1.5"
                      autoFocus
                    />
                  </div>

                  {/* Описание */}
                  <div>
                    <Label htmlFor={`description-${item.id}`} className="text-sm font-medium">{t('events.batch1.agendaManager.s005')}</Label>
                    <Textarea
                      id={`description-${item.id}`}
                      value={item.description || ''}
                      onChange={e => onUpdateField(item.id, 'description', e.target.value || null)}
                      placeholder={t('events.batch1.agendaManager.s006')}
                      className="mt-1.5 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Тип */}
                  <div>
                    <Label htmlFor={`type-${item.id}`} className="text-sm font-medium">{t('events.batch1.agendaManager.s007')}<span className="text-destructive">*</span>
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
                      <Label htmlFor={`date-${item.id}`} className="text-sm font-medium">{t('events.batch1.agendaManager.s008')}<span className="text-destructive">*</span>
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
                            <SelectItem key={day} value={day}>{t('events.batch1.agendaManager.s009')}{index + 1} — {formatEventDay(day, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Время и длительность */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`start-${item.id}`} className="text-sm font-medium">{t('events.batch1.agendaManager.s010')}<span className="text-destructive">*</span>
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
                      <Label htmlFor={`duration-${item.id}`} className="text-sm font-medium">{t('events.batch1.agendaManager.s011')}<span className="text-destructive">*</span>
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
                      <span className="text-muted-foreground">{t('events.batch1.agendaManager.s012')}</span>
                      <span className="font-semibold text-foreground">{endTime}</span>
                    </div>
                  )}

                  {/* Место проведения */}
                  <div>
                    <Label htmlFor={`location-${item.id}`} className="text-sm font-medium">{t('events.batch1.agendaManager.s013')}</Label>
                    <Input
                      id={`location-${item.id}`}
                      list={`location-options-${item.id}`}
                      value={item.location || ''}
                      onChange={e => onUpdateField(item.id, 'location', e.target.value || null)}
                      placeholder={t('events.batch1.agendaManager.s014')}
                      className="mt-1.5"
                    />
                    {knownLocations.length > 0 && (
                      <datalist id={`location-options-${item.id}`}>
                        {knownLocations.map(loc => (
                          <option key={loc} value={loc} />
                        ))}
                      </datalist>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t('events.agenda.form.locationHelp')}
                    </p>
                    {collidingItems.length > 0 && (
                      <p
                        role="status"
                        className="mt-1.5 text-xs text-warning"
                      >
                        {t('events.agenda.form.locationCollideWarning')}
                      </p>
                    )}
                  </div>

                  {/* Спикеры */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">{t('events.batch1.agendaManager.s015')}</Label>
                      {speakers.length > 0 && (
                        <span className="text-xs text-muted-foreground">{t('events.batch1.agendaManager.s016')}{speakers.length}
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
                          <p className="text-xs text-muted-foreground mt-1.5">{t('events.batch1.agendaManager.s017')}{selectedSpeakerIds.length}{t('events.batch1.agendaManager.s018')}{speakers.length}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1.5">{t('events.batch1.agendaManager.s019')}</p>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
                        <User className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">{t('events.batch1.agendaManager.s020')}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">{t('events.batch1.agendaManager.s021')}</p>
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
                      <X className="mr-2 h-4 w-4" />{t('events.batch1.agendaManager.s022')}</Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onSave(item)}
                      disabled={!item.title.trim() || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('events.batch1.agendaManager.s023')}</>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />{t('events.batch1.agendaManager.s024')}</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-4">
                  {/* Информация */}
                  <div className="space-y-2 text-sm">
                    {item.description && (
                      <div>
                        <span className="font-medium text-foreground">{t('events.batch1.agendaManager.s025')}</span>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                          {item.description}
                        </p>
                      </div>
                    )}
                    {item.location && (
                      <div>
                        <span className="font-medium text-foreground">{t('events.batch1.agendaManager.s026')}</span>
                        <span className="text-muted-foreground ml-2">{item.location}</span>
                      </div>
                    )}
                    {itemSpeakers.length > 0 && (
                      <div>
                        <span className="font-medium text-foreground">{t('events.batch1.agendaManager.s027')}</span>
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
                    >{t('events.batch1.agendaManager.s028')}</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive hover:bg-danger-soft"
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
                        <AlertDialogTitle>{t('events.batch1.agendaManager.s029')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('events.batch1.agendaManager.deleteDescription', { title: item.title })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('events.batch1.agendaManager.s022')}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDelete(item.id)}
                        >{t('events.batch1.agendaManager.s030')}</AlertDialogAction>
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
  const t = useT()
  const locale = useLocale()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [editingItems, setEditingItems] = useState<Record<string, LocalAgendaItem>>({})

  const { data, isLoading, error } = useAgendaQuery(eventId)
  const createMutation = useCreateAgendaItem(eventId)
  const updateMutation = useUpdateAgendaItem(eventId)
  const deleteMutation = useDeleteAgendaItem(eventId)
  const reorderMutation = useReorderAgenda(eventId)

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
      toast.error(t('events.batch1.agendaManager.s031'))
      return
    }

    if (item.duration < 1) {
      toast.error(t('events.batch1.agendaManager.s032'))
      return
    }

    // Payload: date и time уже в нужном формате (YYYY-MM-DD, HH:MM)
    const payload = {
      date: item.date,
      title: item.title.trim(),
      type: item.type,
      startTime: item.startTime,
      duration: item.duration,
      sortOrder: item.sortOrder,
      ...(item.description && { description: item.description }),
      ...(item.location && { location: item.location }),
      // materials теперь управляются через отдельный API (agendaMaterialsService)
      ...(item.speakers &&
        item.speakers.length > 0 && { speakerIds: item.speakers.map(s => s.id) }),
    }

    try {
      if (item.isNew) {
        await createMutation.mutateAsync(payload)
        toast.success(t('events.batch1.agendaManager.s033'))
      } else {
        await updateMutation.mutateAsync({ itemId: item.id, data: payload })
        toast.success(t('events.batch1.agendaManager.s034'))
      }
      cancelEditing(item.id)
    } catch (err: unknown) {
      const error = err as {
        message?: string
        details?: {
          code?: string
          message?: string | string[]
          errors?: Record<string, string[]>
          details?: unknown
        }
      }

      const code = error.details?.code
      const i18nKey = code ? AGENDA_ERROR_CODE_KEYS[code] : undefined

      if (i18nKey) {
        toast.error(t(i18nKey))
        return
      }

      const detailsMessage = error.details?.message
      if (Array.isArray(detailsMessage)) {
        detailsMessage.forEach(msg => toast.error(msg))
      } else if (typeof detailsMessage === 'string' && detailsMessage) {
        toast.error(detailsMessage)
      } else if (error.message) {
        toast.error(error.message)
      } else {
        toast.error(t('events.batch1.agendaManager.s035'))
      }
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      await deleteMutation.mutateAsync(itemId)
      toast.success(t('events.batch1.agendaManager.s036'))
    } catch (err) {
      toast.error(t('events.batch1.agendaManager.s037'))
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
      toast.success(t('events.batch1.agendaManager.s038'))
    } catch (err) {
      toast.error(t('events.batch1.agendaManager.s039'))
      console.error('Failed to reorder:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
          <p className="text-sm text-muted-foreground">{t('events.batch1.agendaManager.s040')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-danger-soft p-4 text-sm text-danger-soft-foreground">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">{t('events.batch1.agendaManager.s041')}</p>
          <p className="text-xs text-danger-soft-foreground/90 mt-1">{t('events.batch1.agendaManager.s042')}</p>
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

  // Группируем элементы по дням и пересекающимся временным слотам
  const itemsByDay = eventDays.map(day => {
    const dayItems = allItems.filter(item => item.date === day)
    return {
      date: day,
      slots: groupByOverlap(dayItems as AgendaItem[]) as Array<{
        startMin: number
        endMin: number
        items: LocalAgendaItem[]
      }>,
    }
  })

  const knownLocations = Array.from(
    new Set(
      allItems
        .map(i => (i.location ?? '').trim())
        .filter(loc => loc.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const collidingItemsFor = (item: LocalAgendaItem): LocalAgendaItem[] => {
    const myLoc = normalizeLocation(item.location)
    if (!myLoc) return []
    const myStart = startMinutesOf(item)
    const myEnd = endMinutesOf(item)
    return allItems.filter(other => {
      if (other.id === item.id) return false
      if (other.date !== item.date) return false
      if (normalizeLocation(other.location) !== myLoc) return false
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
          <h3 className="text-lg font-semibold text-foreground">{t('events.batch1.agendaManager.s043')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('events.batch1.agendaManager.s044')}</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addNewItem}
          disabled={createMutation.isPending}
          className="shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />{t('events.batch1.agendaManager.s045')}</Button>
      </div>

      {/* Empty State */}
      {allItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Calendar className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <p className="mt-4 text-base font-medium text-foreground">{t('events.batch1.agendaManager.s046')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('events.batch1.agendaManager.s047')}</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addNewItem}>
            <Plus className="mr-2 h-4 w-4" />{t('events.batch1.agendaManager.s048')}</Button>
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
                        <h4 className="text-sm font-semibold text-foreground">{t('events.batch1.agendaManager.s009')}{index + 1} — {formatEventDay(dayGroup.date, locale)}
                        </h4>
                      </div>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* Элементы программы дня (по временным слотам) */}
                  <div className="space-y-3">
                    {dayGroup.slots.length === 0 ? (
                      <Card className="border-dashed p-6 text-center">
                        <p className="text-sm text-muted-foreground">{t('events.batch1.agendaManager.s049')}</p>
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
                            isParallel={isParallel}
                            knownLocations={knownLocations}
                            collidingItems={collidingItemsFor(item)}
                            onToggleExpand={toggleExpand}
                            onStartEdit={startEditing}
                            onCancelEdit={cancelEditing}
                            onSave={saveItem}
                            onDelete={deleteItem}
                            onUpdateField={updateEditingItem}
                            isSaving={createMutation.isPending || updateMutation.isPending}
                            isDeleting={deleteMutation.isPending}
                          />
                        )
                        if (!isParallel) {
                          return (
                            <div key={slot.items[0]!.id}>
                              {renderCard(slot.items[0]!)}
                            </div>
                          )
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
                            aria-label={t('events.agenda.parallel.aria', { range })}
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
                              <Badge
                                variant="outline"
                                className="text-xs font-medium"
                              >
                                {t('events.agenda.parallel.badge')}
                              </Badge>
                            </header>
                            <div
                              className={cn(
                                'grid gap-3',
                                'grid-cols-1 md:grid-cols-2',
                                colsClass,
                              )}
                            >
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

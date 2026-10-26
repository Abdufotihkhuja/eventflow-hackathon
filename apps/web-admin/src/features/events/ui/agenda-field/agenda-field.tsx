/**
 * @deprecated Этот компонент используется для локального управления agenda в формах создания/редактирования.
 * Для работы с API используйте компонент AgendaManager из @features/events/ui/agenda-manager
 *
 * AgendaField работает только с локальным состоянием формы и не синхронизируется с сервером.
 * Используется в старых формах для обратной совместимости.
 */

import { useState } from 'react'
import { Plus, Trash2, Clock, Calendar } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import {
  Button,
  Card,
  FormDescription,
  FormLabel,
  Input,
  Badge,
  TimeInput,
  DurationInput,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { formatUserName } from '@shared/lib'

type AgendaFieldProps = {
  form: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

type AgendaItem = {
  id: string
  time: string
  duration: number
  title: string
  description: string
  type: 'keynote' | 'presentation' | 'workshop' | 'panel' | 'networking' | 'break'
  speakerIds: string[]
  location: string
}

type Speaker = {
  id: string
  firstName: string
  lastName: string
  position: string
}

const AGENDA_TYPE_LABELS = {
  keynote: 'events.agenda.type.keynote',
  presentation: 'events.agenda.type.presentation',
  workshop: 'events.agenda.type.workshop',
  panel: 'events.agenda.type.panel',
  networking: 'events.agenda.type.networking',
  break: 'events.agenda.type.break',
} as const

const AGENDA_TYPE_COLORS = {
  keynote: 'bg-brand-soft text-brand-soft-foreground',
  presentation: 'bg-brand-soft text-brand-soft-foreground',
  workshop: 'bg-brand-soft text-brand-soft-foreground',
  panel: 'bg-brand-soft text-brand-soft-foreground',
  networking: 'bg-brand-soft text-brand-soft-foreground',
  break: 'bg-muted text-muted-foreground',
} as const

export function AgendaField({ form }: AgendaFieldProps) {
  const t = useT()
  const agenda = form.watch('agenda') || []
  const speakers = form.watch('speakers') || []
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const addAgendaItem = () => {
    const newItem = {
      id: `agenda-${Date.now()}`,
      time: '',
      duration: 60,
      title: '',
      description: '',
      type: 'presentation' as const,
      speakerIds: [],
      location: '',
    }
    form.setValue('agenda', [...agenda, newItem])
    setExpandedItem(newItem.id)
  }

  const removeAgendaItem = (id: string) => {
    form.setValue(
      'agenda',
      agenda.filter((item: AgendaItem) => item.id !== id)
    )
    if (expandedItem === id) {
      setExpandedItem(null)
    }
  }

  const updateAgendaItem = (id: string, field: string, value: string | number | string[]) => {
    const updated = agenda.map((item: AgendaItem) =>
      item.id === id ? { ...item, [field]: value } : item
    )
    form.setValue('agenda', updated)
  }

  const toggleSpeaker = (agendaId: string, speakerId: string) => {
    const item = agenda.find((a: AgendaItem) => a.id === agendaId)
    if (!item) return

    const currentSpeakers = item.speakerIds || []
    const newSpeakers = currentSpeakers.includes(speakerId)
      ? currentSpeakers.filter((id: string) => id !== speakerId)
      : [...currentSpeakers, speakerId]

    updateAgendaItem(agendaId, 'speakerIds', newSpeakers)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <FormLabel>Программа мероприятия</FormLabel>
          <FormDescription>Создайте расписание с указанием времени и спикеров</FormDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addAgendaItem}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить пункт
        </Button>
      </div>

      {agenda.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">Программа не создана</p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addAgendaItem}>
            Добавить первый пункт
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {agenda.map((item: AgendaItem, index: number) => {
            const isExpanded = expandedItem === item.id
            const errors = form.formState.errors.agenda?.[index]
            const itemSpeakers = speakers.filter((s: Speaker) => item.speakerIds?.includes(s.id))

            return (
              <Card key={item.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
                      <Clock className="h-5 w-5 text-brand-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {item.title || `Пункт ${index + 1}`}
                        </p>
                        <Badge className={cn('text-xs', AGENDA_TYPE_COLORS[item.type])}>
                          {t(AGENDA_TYPE_LABELS[item.type])}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {item.time && <span>{item.time}</span>}
                        {item.duration && <span>{item.duration} мин</span>}
                        {itemSpeakers.length > 0 && (
                          <span>
                            {itemSpeakers
                              .map((s: Speaker) => formatUserName(s.firstName, s.lastName))
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {errors && (
                      <span className="text-xs text-destructive">Заполните обязательные поля</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        removeAgendaItem(item.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-border bg-muted/30 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-muted-foreground">
                          Время начала *
                        </label>
                        <TimeInput
                          value={item.time}
                          onChange={value => updateAgendaItem(item.id, 'time', value)}
                          className="mt-1"
                        />
                        {errors?.time && (
                          <p className="mt-1 text-xs text-destructive">{errors.time.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-muted-foreground">
                          Длительность *
                        </label>
                        <DurationInput
                          value={item.duration}
                          onChange={v => updateAgendaItem(item.id, 'duration', v)}
                          className="mt-1"
                        />
                        {errors?.duration && (
                          <p className="mt-1 text-xs text-destructive">{errors.duration.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Название *
                      </label>
                      <Input
                        placeholder="Название сессии"
                        value={item.title}
                        onChange={e => updateAgendaItem(item.id, 'title', e.target.value)}
                      />
                      {errors?.title && (
                        <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">Тип *</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {Object.entries(AGENDA_TYPE_LABELS).map(([type, labelKey]) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateAgendaItem(item.id, 'type', type)}
                            className={cn(
                              'rounded-lg border p-2 text-center text-sm transition',
                              item.type === type
                                ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary font-medium'
                                : 'border-border bg-background hover:border-border hover:bg-muted/50'
                            )}
                          >
                            {t(labelKey)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Описание
                      </label>
                      <textarea
                        placeholder="Краткое описание..."
                        className={cn(
                          'min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
                          'focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20'
                        )}
                        value={item.description}
                        onChange={e => updateAgendaItem(item.id, 'description', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Локация (для гибридных событий)
                      </label>
                      <Input
                        placeholder="Зал A, Комната 101..."
                        value={item.location}
                        onChange={e => updateAgendaItem(item.id, 'location', e.target.value)}
                      />
                    </div>

                    {speakers.length > 0 && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-muted-foreground">
                          Спикеры
                        </label>
                        <div className="space-y-2">
                          {speakers.map((speaker: Speaker) => {
                            const isSelected = item.speakerIds?.includes(speaker.id)
                            return (
                              <button
                                key={speaker.id}
                                type="button"
                                onClick={() => toggleSpeaker(item.id, speaker.id)}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition',
                                  isSelected
                                    ? 'border-brand-secondary bg-brand-secondary/5'
                                    : 'border-border hover:border-border hover:bg-muted/50'
                                )}
                              >
                                <div
                                  className={cn(
                                    'h-4 w-4 rounded border-2 transition',
                                    isSelected
                                      ? 'border-brand-secondary bg-brand-secondary'
                                      : 'border-border'
                                  )}
                                />
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {formatUserName(speaker.firstName, speaker.lastName)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{speaker.position}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

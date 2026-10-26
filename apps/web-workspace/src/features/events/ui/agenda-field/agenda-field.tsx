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
  form: any
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

const AGENDA_TYPE_COLORS = {
  keynote: 'bg-brand-soft text-brand-soft-foreground',
  presentation: 'bg-info-soft text-info-soft-foreground',
  workshop: 'bg-success-soft text-success-soft-foreground',
  panel: 'bg-info-soft text-info-soft-foreground',
  networking: 'bg-warning-soft text-warning-soft-foreground',
  break: 'bg-neutral-soft text-neutral-soft-foreground',
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
          <FormLabel>{t('events.agenda.field.title')}</FormLabel>
          <FormDescription>{t('events.agenda.field.description')}</FormDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addAgendaItem}>
          <Plus className="mr-2 h-4 w-4" />
          {t('events.agenda.manager.addItem')}
        </Button>
      </div>

      {agenda.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.agenda.manager.emptyTitle')}</p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addAgendaItem}>
            {t('events.agenda.manager.addFirstItem')}
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
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
                      <Clock className="h-5 w-5 text-brand-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {item.title || `${t('events.agenda.field.itemLabel')} ${index + 1}`}
                        </p>
                        <Badge className={cn('text-xs', AGENDA_TYPE_COLORS[item.type])}>
                          {t(`events.agenda.type.${item.type}`)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {item.time && <span>{item.time}</span>}
                        {item.duration && (
                          <span>
                            {item.duration} {t('events.agenda.manager.minuteShort')}
                          </span>
                        )}
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
                      <span className="text-xs text-destructive">
                        {t('events.speakers.form.requiredFields')}
                      </span>
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
                  <div className="space-y-4 border-t border-border bg-muted/50 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-muted-foreground">
                          {t('events.agenda.manager.startTimeLabel')} *
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
                          {t('events.agenda.manager.durationLabel')} *
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
                        {t('events.agenda.manager.titleLabel')} *
                      </label>
                      <Input
                        placeholder={t('events.agenda.field.titlePlaceholder')}
                        value={item.title}
                        onChange={e => updateAgendaItem(item.id, 'title', e.target.value)}
                      />
                      {errors?.title && (
                        <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        {t('events.agenda.manager.activityTypeLabel')} *
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(
                          ['keynote', 'presentation', 'workshop', 'panel', 'networking', 'break'] as const
                        ).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateAgendaItem(item.id, 'type', type)}
                            className={cn(
                              'rounded-lg border p-2 text-center text-sm transition',
                              item.type === type
                                ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary font-medium'
                                : 'border-border bg-card hover:border-border hover:bg-muted/40'
                            )}
                          >
                            {t(`events.agenda.type.${type}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        {t('events.agenda.manager.descriptionLabel')}
                      </label>
                      <textarea
                        placeholder={t('events.agenda.manager.descriptionPlaceholder')}
                        className={cn(
                          'min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm',
                          'focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20'
                        )}
                        value={item.description}
                        onChange={e => updateAgendaItem(item.id, 'description', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        {t('events.agenda.field.locationLabel')}
                      </label>
                      <Input
                        placeholder={t('events.agenda.field.locationPlaceholder')}
                        value={item.location}
                        onChange={e => updateAgendaItem(item.id, 'location', e.target.value)}
                      />
                    </div>

                    {speakers.length > 0 && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-muted-foreground">
                          {t('events.agenda.manager.speakersLabel')}
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
                                    : 'border-border hover:border-border hover:bg-muted/40'
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

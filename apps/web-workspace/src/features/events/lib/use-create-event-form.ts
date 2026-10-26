import { zodResolver } from '@hookform/resolvers/zod'
import { useT } from '@eventflow/i18n/react'
import { useForm } from 'react-hook-form'

import { AccessType, EventFormat, EventType } from '@entities/event'

import { createCreateEventSchema, type CreateEventFormValues } from './schemas/create-event-schema'

const defaultValues: Partial<CreateEventFormValues> = {
  type: EventType.FREE,
  accessType: AccessType.OPEN,
  format: EventFormat.OFFLINE,
  currency: 'UZS',
  commentsEnabled: true,
  registrationOpen: true,
  shortDescription: '',
  slug: '',
  venue: '',
  address: '',
  city: '',
  onlineUrl: '',
  speakers: [],
  agenda: [],
  customQuestions: [],
  categoryIds: [],
}

export function useCreateEventForm() {
  const t = useT()

  return useForm<CreateEventFormValues>({
    resolver: zodResolver(createCreateEventSchema(t)) as any,
    defaultValues,
    mode: 'onBlur',
  })
}

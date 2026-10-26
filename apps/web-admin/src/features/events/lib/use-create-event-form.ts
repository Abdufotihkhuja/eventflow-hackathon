import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { AccessType, EventFormat, EventType } from '@entities/event'

import { createEventSchema, type CreateEventFormValues } from './schemas/create-event-schema'

const defaultValues: Partial<CreateEventFormValues> = {
  type: EventType.FREE,
  accessType: AccessType.OPEN,
  format: EventFormat.OFFLINE,
  currency: 'UZS',
  commentsEnabled: true,
  shortDescription: '',
  slug: '',
  venue: '',
  address: '',
  city: '',
  onlineUrl: '',
  speakers: [],
  agenda: [],
  customQuestions: [],
}

export function useCreateEventForm() {
  return useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema) as any,
    defaultValues,
    mode: 'onBlur',
  })
}

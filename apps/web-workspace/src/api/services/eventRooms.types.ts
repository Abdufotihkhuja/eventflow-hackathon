/**
 * Per-event "зал/сцена" entity. Each Event has its own rooms list; agenda
 * items reference a room via FK (roomId). Room name is multilingual via
 * translations (ru/uz/en) with the scalar `name` field as fallback.
 */

export type BusinessTranslationsBag = Record<
  string,
  Partial<Record<'ru' | 'uz' | 'en', string>>
>

export type EventRoom = {
  id: string
  eventId: string
  name: string
  translations?: BusinessTranslationsBag | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateEventRoomRequest = {
  name: string
  sortOrder?: number
  isActive?: boolean
  translations?: BusinessTranslationsBag
}

export type UpdateEventRoomRequest = {
  name?: string
  sortOrder?: number
  isActive?: boolean
  translations?: BusinessTranslationsBag
}

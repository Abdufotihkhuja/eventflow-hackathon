import type {
  AccessType as AccessTypeType,
  EventType as EventTypeType,
  EventFormat as EventFormatType,
  EventStatus as EventStatusType,
  ParticipantStatus as ParticipantStatusType,
} from '@api/services/event.types'

import {
  ACCESS_TYPE_LABEL_KEYS,
  EVENT_FORMAT_LABEL_KEYS,
  EVENT_STATUS_LABEL_KEYS,
  EVENT_TYPE_LABEL_KEYS,
  PARTICIPANT_STATUS_LABEL_KEYS,
} from './constants'

type Translator = (key: string) => string

/**
 * Curried label-резолверы: принимают translator t, возвращают функцию,
 * которая по enum-значению вернёт локализованный label через
 * соответствующий *_LABEL_KEYS словарь.
 */

export function getEventTypeLabel(t: Translator): (value: EventTypeType) => string {
  return (value) => t(EVENT_TYPE_LABEL_KEYS[value])
}

export function getAccessTypeLabel(t: Translator): (value: AccessTypeType) => string {
  return (value) => t(ACCESS_TYPE_LABEL_KEYS[value])
}

export function getEventFormatLabel(t: Translator): (value: EventFormatType) => string {
  return (value) => t(EVENT_FORMAT_LABEL_KEYS[value])
}

export function getEventStatusLabel(t: Translator): (value: EventStatusType) => string {
  return (value) => t(EVENT_STATUS_LABEL_KEYS[value])
}

export function getParticipantStatusLabel(
  t: Translator,
): (value: ParticipantStatusType) => string {
  return (value) => t(PARTICIPANT_STATUS_LABEL_KEYS[value])
}

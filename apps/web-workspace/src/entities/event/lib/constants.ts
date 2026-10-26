import {
  AccessType,
  EventFormat,
  EventStatus,
  EventType,
  ParticipantStatus,
  type AccessType as AccessTypeType,
  type EventType as EventTypeType,
  type EventFormat as EventFormatType,
  type EventStatus as EventStatusType,
  type ParticipantStatus as ParticipantStatusType,
} from '@api/services/event.types'
import { createLabelGetter, type Translator } from '@eventflow/i18n'

export const EVENT_TYPE_LABEL_KEYS = {
  [EventType.FREE]: 'events.type.free',
  [EventType.PAID]: 'events.type.paid',
} as const satisfies Record<EventTypeType, string>

export const ACCESS_TYPE_LABEL_KEYS = {
  [AccessType.OPEN]: 'events.access.open',
  [AccessType.REQUEST]: 'events.access.request',
  [AccessType.INVITE_ONLY]: 'events.access.inviteOnly',
  [AccessType.PRIVATE]: 'events.access.private',
} as const satisfies Record<AccessTypeType, string>

export const EVENT_FORMAT_LABEL_KEYS = {
  [EventFormat.ONLINE]: 'events.format.online',
  [EventFormat.OFFLINE]: 'events.format.offline',
  [EventFormat.HYBRID]: 'events.format.hybrid',
} as const satisfies Record<EventFormatType, string>

export const EVENT_STATUS_LABEL_KEYS = {
  [EventStatus.DRAFT]: 'events.status.draft',
  [EventStatus.PENDING_REVIEW]: 'events.status.pendingReview',
  [EventStatus.PUBLISHED]: 'events.status.published',
  [EventStatus.COMPLETED]: 'events.status.completed',
  [EventStatus.CANCELLED]: 'events.status.cancelled',
} as const satisfies Record<EventStatusType, string>

export const PARTICIPANT_STATUS_LABEL_KEYS = {
  [ParticipantStatus.PENDING]: 'events.participantStatus.pending',
  [ParticipantStatus.CONFIRMED]: 'events.participantStatus.confirmed',
  [ParticipantStatus.ATTENDED]: 'events.participantStatus.attended',
  [ParticipantStatus.CANCELLED]: 'events.participantStatus.cancelled',
} as const satisfies Record<ParticipantStatusType, string>

export const EVENT_STATUS_COLORS: Record<EventStatusType, string> = {
  [EventStatus.DRAFT]: 'bg-slate-100 text-slate-700 border-slate-200',
  [EventStatus.PENDING_REVIEW]: 'bg-amber-100 text-amber-700 border-amber-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-700 border-green-200',
  [EventStatus.COMPLETED]: 'bg-gray-100 text-gray-700 border-gray-200',
  [EventStatus.CANCELLED]: 'bg-red-100 text-red-700 border-red-200',
}

export const PARTICIPANT_STATUS_COLORS: Record<ParticipantStatusType, string> = {
  [ParticipantStatus.PENDING]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [ParticipantStatus.CONFIRMED]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ParticipantStatus.ATTENDED]: 'bg-green-100 text-green-700 border-green-200',
  [ParticipantStatus.CANCELLED]: 'bg-red-100 text-red-700 border-red-200',
}

export const CURRENCY_LABEL_KEYS = {
  UZS: 'events.currencies.UZS',
  USD: 'events.currencies.USD',
  EUR: 'events.currencies.EUR',
  KZT: 'events.currencies.KZT',
  RUB: 'events.currencies.RUB',
  KGS: 'events.currencies.KGS',
  TJS: 'events.currencies.TJS',
  TRY: 'events.currencies.TRY',
} as const

export const CURRENCY_OPTIONS = Object.keys(CURRENCY_LABEL_KEYS) as Array<
  keyof typeof CURRENCY_LABEL_KEYS
>

export const getEventTypeLabel = (t: Translator) => createLabelGetter(EVENT_TYPE_LABEL_KEYS, t)
export const getAccessTypeLabel = (t: Translator) => createLabelGetter(ACCESS_TYPE_LABEL_KEYS, t)
export const getEventFormatLabel = (t: Translator) =>
  createLabelGetter(EVENT_FORMAT_LABEL_KEYS, t)
export const getEventStatusLabel = (t: Translator) =>
  createLabelGetter(EVENT_STATUS_LABEL_KEYS, t)
export const getParticipantStatusLabel = (t: Translator) =>
  createLabelGetter(PARTICIPANT_STATUS_LABEL_KEYS, t)
export const getCurrencyLabel = (t: Translator) => createLabelGetter(CURRENCY_LABEL_KEYS, t)

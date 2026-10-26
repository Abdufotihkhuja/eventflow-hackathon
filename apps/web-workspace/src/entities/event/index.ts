export type {
  Event,
  EventType as EventTypeType,
  AccessType as AccessTypeType,
  EventFormat as EventFormatType,
  EventStatus as EventStatusType,
  EventParticipant,
  ParticipantStatus as ParticipantStatusType,
  AttendanceRecord,
  EventChatMessage,
  CustomRegistrationQuestion,
  Gender as GenderType,
  Speaker,
  AgendaItem,
  EventDescription,
  BlockNoteBlock,
  BlockNoteContent,
  Organization,
  RegistrationMode as RegistrationModeType,
  TestEvaluationType as TestEvaluationTypeType,
} from '@api/services/event.types'

// Экспорт констант как значений
export {
  EventType,
  AccessType,
  EventFormat,
  EventStatus,
  ParticipantStatus,
  Gender,
} from '@api/services/event.types'

export {
  EVENT_TYPE_LABEL_KEYS,
  ACCESS_TYPE_LABEL_KEYS,
  EVENT_FORMAT_LABEL_KEYS,
  EVENT_STATUS_LABEL_KEYS,
  PARTICIPANT_STATUS_LABEL_KEYS,
  CURRENCY_LABEL_KEYS,
  getEventTypeLabel,
  getAccessTypeLabel,
  getEventFormatLabel,
  getEventStatusLabel,
  getParticipantStatusLabel,
  getCurrencyLabel,
  EVENT_STATUS_COLORS,
  PARTICIPANT_STATUS_COLORS,
  CURRENCY_OPTIONS,
} from './lib/constants'

export { resolveLocalizedField, resolveLocalizedRichField } from './lib/localized-field'

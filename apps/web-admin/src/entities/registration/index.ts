export type {
  Registration,
  RegistrationStatus as RegistrationStatusType,
  RegistrationRole as RegistrationRoleType,
  RegistrationUser,
  QuestionAnswer,
  RegistrationQuestion,
  PublicQuestion,
  QuestionCategory as QuestionCategoryType,
} from '@api/services/registration.types'

// Экспорт констант как значений
export {
  RegistrationStatus,
  RegistrationRole,
  QuestionCategory,
} from '@api/services/registration.types'

export {
  REGISTRATION_STATUS_LABEL_KEYS,
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_ROLE_LABEL_KEYS,
  TICKET_ELIGIBLE_STATUSES,
  isTicketEligible,
} from './lib/constants'

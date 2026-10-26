import {
  RegistrationStatus,
  RegistrationRole,
  type RegistrationStatus as RegistrationStatusType,
  type RegistrationRole as RegistrationRoleType,
} from '@api/services/registration.types'

export const REGISTRATION_STATUS_LABEL_KEYS: Record<RegistrationStatusType, string> = {
  [RegistrationStatus.PENDING]: 'registrations.status.pending',
  [RegistrationStatus.APPROVED]: 'registrations.status.approved',
  [RegistrationStatus.CONFIRMED]: 'registrations.status.confirmed', // Deprecated
  [RegistrationStatus.REJECTED]: 'registrations.status.rejected',
  [RegistrationStatus.CANCELLED]: 'registrations.status.cancelled',
  [RegistrationStatus.WAITLIST]: 'registrations.status.waitlist',
}

export const REGISTRATION_STATUS_COLORS: Record<RegistrationStatusType, string> = {
  [RegistrationStatus.PENDING]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [RegistrationStatus.APPROVED]: 'bg-green-100 text-green-700 border-green-200',
  [RegistrationStatus.CONFIRMED]: 'bg-blue-100 text-blue-700 border-blue-200', // Deprecated
  [RegistrationStatus.REJECTED]: 'bg-red-100 text-red-700 border-red-200',
  [RegistrationStatus.CANCELLED]: 'bg-gray-100 text-gray-700 border-gray-200',
  [RegistrationStatus.WAITLIST]: 'bg-purple-100 text-purple-700 border-purple-200',
}

export const REGISTRATION_ROLE_LABEL_KEYS: Record<RegistrationRoleType, string> = {
  [RegistrationRole.PARTICIPANT]: 'registrations.role.participant',
  [RegistrationRole.SPEAKER]: 'registrations.role.speaker',
  [RegistrationRole.ORGANIZER]: 'registrations.role.organizer',
  [RegistrationRole.VOLUNTEER]: 'registrations.role.volunteer',
}

/**
 * Статусы регистрации, для которых доступны билеты
 * Билеты генерируются только для одобренных участников
 */
export const TICKET_ELIGIBLE_STATUSES: RegistrationStatusType[] = [RegistrationStatus.APPROVED]

/**
 * Проверяет, доступен ли билет для данного статуса регистрации
 */
export function isTicketEligible(status: RegistrationStatusType): boolean {
  return TICKET_ELIGIBLE_STATUSES.includes(status)
}

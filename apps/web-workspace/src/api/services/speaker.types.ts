// ================================
// Speakers Types
// ================================

export type InvitationStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export type Speaker = {
  id: string
  eventId: string
  userId: string | null
  firstName: string
  lastName: string
  position: string
  company?: string | null
  bio?: string | null
  avatarUrl?: string | null
  linkedinUrl?: string | null
  websiteUrl?: string | null
  invitationStatus: InvitationStatus | null
  invitationToken?: string | null
  tokenExpiresAt?: string | null
  invitedEmail?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  /** Локализация position/company/bio (ru/uz/en). Имена/URL не переводятся. */
  translations?: import('./event.types').BusinessTranslationValues | null
  translationMeta?: import('./event.types').BusinessTranslationMeta | null
}

// ================================
// Request/Response Types
// ================================

export type CreateSpeakerRequest = {
  firstName: string
  lastName: string
  position: string
  company?: string
  bio?: string
  avatarUrl?: string
  email?: string
  linkedinUrl?: string
  websiteUrl?: string
  sortOrder?: number
  /** Локализация position/company/bio (ru/uz/en). */
  translations?: import('./event.types').BusinessTranslationValues
  translationMeta?: import('./event.types').BusinessTranslationMeta
}

export type UpdateSpeakerRequest = Partial<CreateSpeakerRequest>

export type GetSpeakersResponse = {
  speakers: Speaker[]
}

export type ReorderSpeakersRequest = {
  speakerIds: string[]
}

// ================================
// Invitation Types
// ================================

export type InviteSpeakerRequest = {
  email: string
  firstName: string
  lastName: string
  position: string
  company?: string
  bio?: string
  linkedinUrl?: string
  websiteUrl?: string
  /** Локализация position/company/bio (ru/uz/en). */
  translations?: import('./event.types').BusinessTranslationValues
  translationMeta?: import('./event.types').BusinessTranslationMeta
}

export type InviteSpeakerResponse = {
  speaker: Speaker
  invitationSent: boolean
}

/**
 * Ответ GET /v1/speakers/invitation/{token}.
 *
 * Статуса и срока действия здесь нет намеренно: эндпоинт отдаёт 400 на
 * истёкший токен и на уже обработанное приглашение, поэтому сам факт успешного
 * ответа означает «приглашение живое и ждёт решения».
 */
export type SpeakerInvitation = {
  speakerId: string
  eventId: string
  eventTitle: string
  eventStartDate: string
  eventEndDate: string
  organizationName: string
  role: 'SPEAKER'
  firstName: string
  lastName: string
  /** Email, на который organizer отправил приглашение — принять можно только им. */
  invitedEmail: string | null
  /** Есть ли уже аккаунт участника с этим email: вход или регистрация. */
  userExists: boolean
}

export type AcceptInvitationRequest = {
  token: string
  bio?: string
  company?: string
  linkedinUrl?: string
  websiteUrl?: string
}

export type RejectInvitationRequest = {
  token: string
  reason?: string
}

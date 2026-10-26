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
}

export type InviteSpeakerResponse = {
  speaker: Speaker
  invitationSent: boolean
}

export type SpeakerInvitation = {
  id: string
  token: string
  eventId: string
  eventTitle: string
  eventStartDate: string
  eventEndDate: string
  organizerName: string
  speakerEmail: string
  speakerName: string
  speakerPosition?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  expiresAt: string
  createdAt: string
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

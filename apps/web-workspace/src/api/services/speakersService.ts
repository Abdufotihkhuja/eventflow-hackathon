/**
 * API сервис для управления спикерами события
 */

import { request } from '@api/apiClient'

import type {
  Speaker,
  CreateSpeakerRequest,
  UpdateSpeakerRequest,
  GetSpeakersResponse,
  ReorderSpeakersRequest,
  InviteSpeakerRequest,
  InviteSpeakerResponse,
  SpeakerInvitation,
  AcceptInvitationRequest,
  RejectInvitationRequest,
} from './speaker.types'

const getSpeakersUrl = (eventId: string) => `/v1/events/${eventId}/speakers`

export const speakersService = {
  /** Получить спикеров события */
  getSpeakers: (eventId: string) =>
    request<GetSpeakersResponse>({
      method: 'GET',
      url: getSpeakersUrl(eventId),
    }),

  /** Получить спикера по ID */
  getSpeaker: (eventId: string, speakerId: string) =>
    request<Speaker>({
      method: 'GET',
      url: `${getSpeakersUrl(eventId)}/${speakerId}`,
    }),

  /** Создать спикера (ручное добавление) */
  createSpeaker: (eventId: string, data: CreateSpeakerRequest) =>
    request<Speaker, CreateSpeakerRequest>({
      method: 'POST',
      url: getSpeakersUrl(eventId),
      data,
    }),

  /** Обновить спикера */
  updateSpeaker: (eventId: string, speakerId: string, data: UpdateSpeakerRequest) =>
    request<Speaker, UpdateSpeakerRequest>({
      method: 'PATCH',
      url: `${getSpeakersUrl(eventId)}/${speakerId}`,
      data,
    }),

  /** Удалить спикера */
  deleteSpeaker: (eventId: string, speakerId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getSpeakersUrl(eventId)}/${speakerId}`,
    }),

  /** Изменить порядок спикеров */
  reorderSpeakers: (eventId: string, data: ReorderSpeakersRequest) =>
    request<GetSpeakersResponse, ReorderSpeakersRequest>({
      method: 'PATCH',
      url: `${getSpeakersUrl(eventId)}/reorder`,
      data,
    }),

  // ================================
  // Invitations
  // ================================

  /** Отправить приглашение спикеру */
  inviteSpeaker: (eventId: string, data: InviteSpeakerRequest) =>
    request<InviteSpeakerResponse, InviteSpeakerRequest>({
      method: 'POST',
      url: `${getSpeakersUrl(eventId)}/invite`,
      data,
    }),

  /** Повторно отправить приглашение спикеру */
  resendInvitation: (eventId: string, speakerId: string) =>
    request<{ success: boolean }>({
      method: 'POST',
      url: `${getSpeakersUrl(eventId)}/${speakerId}/resend-invitation`,
    }),

  // ================================
  // Public Invitation Endpoints
  // ================================

  /** Получить информацию о приглашении по токену (публичный) */
  getInvitation: (token: string) =>
    request<SpeakerInvitation>({
      method: 'GET',
      url: `/v1/speakers/invitation/${token}`,
    }),

  /** Принять приглашение спикера */
  acceptInvitation: (data: AcceptInvitationRequest) =>
    request<Speaker, AcceptInvitationRequest>({
      method: 'POST',
      url: '/v1/speakers/invitation/accept',
      data,
    }),

  /** Отклонить приглашение спикера */
  rejectInvitation: (data: RejectInvitationRequest) =>
    request<{ success: boolean }, RejectInvitationRequest>({
      method: 'POST',
      url: '/v1/speakers/invitation/reject',
      data,
    }),
} as const

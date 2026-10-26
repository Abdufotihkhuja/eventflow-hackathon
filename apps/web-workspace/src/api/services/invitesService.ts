/**
 * API сервис для приглашений в организацию (organization invites).
 *
 * Публичные эндпоинты (preview/accept) вызываются без обязательной авторизации,
 * но при наличии токена он будет приложен (optional auth) — поэтому skipAuth не ставим,
 * чтобы backend мог увидеть текущего пользователя.
 */

import { request } from '@api/apiClient'

import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  CreateInviteRequest,
  InvitePreview,
  InviteStatus,
  InviteSummary,
} from './invite.types'

const INVITES_URL = '/v1/organizations/invites'

export const invitesService = {
  // ================================
  // Публичные эндпоинты (по токену)
  // ================================

  /**
   * Просмотр приглашения по токену.
   * GET /api/v1/organizations/invites/:token
   */
  getByToken: (token: string) =>
    request<InvitePreview>({
      method: 'GET',
      url: `${INVITES_URL}/${encodeURIComponent(token)}`,
    }),

  /**
   * Принять приглашение по токену.
   * POST /api/v1/organizations/invites/:token/accept
   * Пароль передаётся только для новых пользователей (SIGNUP_TO_ACCEPT).
   */
  accept: (token: string, payload: AcceptInviteRequest = {}) =>
    request<AcceptInviteResponse, AcceptInviteRequest>({
      method: 'POST',
      url: `${INVITES_URL}/${encodeURIComponent(token)}/accept`,
      data: payload,
    }),

  // ================================
  // Админ-управление приглашениями
  // ================================

  /**
   * Создать приглашение.
   * POST /api/v1/organizations/invites
   */
  create: (payload: CreateInviteRequest) =>
    request<InviteSummary, CreateInviteRequest>({
      method: 'POST',
      url: INVITES_URL,
      data: payload,
    }),

  /**
   * Список приглашений (опционально по статусу).
   * GET /api/v1/organizations/invites?status=PENDING
   */
  list: (status?: InviteStatus) =>
    request<InviteSummary[]>({
      method: 'GET',
      url: INVITES_URL,
      params: status ? { status } : undefined,
    }),

  /**
   * Повторно отправить приглашение.
   * POST /api/v1/organizations/invites/:inviteId/resend
   */
  resend: (inviteId: string) =>
    request<InviteSummary>({
      method: 'POST',
      url: `${INVITES_URL}/${inviteId}/resend`,
    }),

  /**
   * Отозвать приглашение.
   * DELETE /api/v1/organizations/invites/:inviteId
   */
  revoke: (inviteId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${INVITES_URL}/${inviteId}`,
    }),
} as const

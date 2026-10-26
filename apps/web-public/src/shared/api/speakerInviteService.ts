/**
 * API: приглашения спикера (USER)
 * GET /api/v1/speakers/invitation/:token
 * POST /api/v1/speakers/invitation/accept
 * POST /api/v1/speakers/invitation/reject
 */

import { apiGet, apiPost } from "../lib/apiClient";

// ============================================================================
// Types
// ============================================================================

export interface SpeakerInvitePage {
  token: string;
  eventId: string;
  eventTitle: string;
  organizationName: string;
  invitedEmail?: string;
  expiresAt?: string;
}

export interface AcceptSpeakerInviteBody {
  token: string;
}

export interface RejectSpeakerInviteBody {
  token: string;
}

// ============================================================================
// Endpoints
// ============================================================================

const SPEAKERS_BASE = "/api/v1/speakers/invitation";

// ============================================================================
// Service
// ============================================================================

export const speakerInviteService = {
  /**
   * Страница приглашения спикера по токену (публичный эндпоинт)
   * GET /api/v1/speakers/invitation/:token
   */
  getInviteByToken: async (token: string): Promise<SpeakerInvitePage> => {
    return apiGet<SpeakerInvitePage>(`${SPEAKERS_BASE}/${token}`, {
      skipAuth: true,
    });
  },

  acceptInvite: async (
    data: AcceptSpeakerInviteBody
  ): Promise<{ message?: string; registrationId?: string }> => {
    return apiPost(`${SPEAKERS_BASE}/accept`, data);
  },

  rejectInvite: async (
    data: RejectSpeakerInviteBody
  ): Promise<{ message?: string }> => {
    return apiPost(`${SPEAKERS_BASE}/reject`, data);
  },
};

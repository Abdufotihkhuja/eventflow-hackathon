/**
 * API: самостоятельная отметка посещения (USER)
 * POST /api/v1/events/:eventId/attendance/self-check-in
 */

import { apiPost } from "../lib/apiClient";

// ============================================================================
// Types
// ============================================================================

export interface SelfCheckInAttendance {
  id: string;
  checkInAt: string;
  checkInDate: string;
}

export interface SelfCheckInEvent {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
}

export interface SelfCheckInResult {
  attendance: SelfCheckInAttendance;
  event: SelfCheckInEvent;
}

/**
 * Коды ошибок self-check-in — тело ошибки несёт { code, message }.
 * UI ветвится строго по code, не по тексту message.
 */
export type SelfCheckInErrorCode =
  | "not_registered"
  | "event_not_found"
  | "pending_review"
  | "rejected"
  | "cancelled"
  | "not_approved"
  | "event_not_started"
  | "expired"
  | "already_used";

/**
 * Тело 409 already_used: помимо { code, message } сервер присылает details
 * с alreadyCheckedIn, lastCheckInAt и registrationId (глобальный
 * AllExceptionsFilter на бэке пропускает наружу только message/code/details).
 * extractErrorFromResponse в apiClient сохраняет весь JSON ответа
 * в ApiError.data, поэтому details доступен через safe-cast
 * с runtime-проверкой.
 */
export interface SelfCheckInAlreadyUsedErrorData {
  message: string;
  code?: string;
  details?: {
    alreadyCheckedIn?: boolean;
    lastCheckInAt?: string;
    registrationId?: string;
  };
}

// ============================================================================
// Service
// ============================================================================

export const attendanceService = {
  /**
   * Отметить своё посещение события (участник, Bearer JWT).
   * POST /api/v1/events/:eventId/attendance/self-check-in
   *
   * skipAuthRedirect: страница /check-in сама показывает sign-in gate на 401
   * вместо принудительного редиректа на /login без сохранения пути.
   */
  selfCheckIn: async (eventId: string): Promise<SelfCheckInResult> => {
    return apiPost<SelfCheckInResult>(
      `/api/v1/events/${eventId}/attendance/self-check-in`,
      undefined,
      { skipAuthRedirect: true }
    );
  },
};

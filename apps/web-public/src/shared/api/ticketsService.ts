/**
 * API: билеты пользователя (USER)
 * GET /api/v1/registrations/:id/ticket
 * GET /api/v1/events/:eventId/my-ticket
 * POST /api/v1/events/:eventId/tickets/download-all
 */

import { apiGet, apiPost } from "../lib/apiClient";

// ============================================================================
// Types
// ============================================================================

export type TicketDesign = "branded" | "simple";

export interface TicketResponse {
  ticketUrl?: string;
  qrCode?: string;
  ticketNumber?: string;
  eventTitle?: string;
  eventDate?: string;
  userName?: string;
}

export interface DownloadAllTicketsBody {
  eventId: string;
}

export interface DownloadAllTicketsResponse {
  downloadUrl?: string;
  message?: string;
}

// ----------------------------------------------------------------------------
// Premium e-ticket view-model (mirrors EventTicketViewModelDto on backend).
// Endpoint returns ticket only when registration is APPROVED — pending /
// rejected / cancelled responses surface as 404 with explanatory message.
// ----------------------------------------------------------------------------

export type EventTicketStatus = "active" | "checked_in" | "used";

export interface EventTicketOrganization {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  accentColor: string | null;
}

export interface EventTicketEvent {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  venue: string | null;
  city: string | null;
  format: "ONLINE" | "OFFLINE" | "HYBRID" | string;
  coverImage: string | null;
}

export interface EventTicketAttendee {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export interface EventTicketCore {
  id: string;
  number: string;
  type: string;
  status: EventTicketStatus;
  qrPayload: string | null;
  qrCheckInUrl: string | null;
  issuedAt: string | null;
  lastCheckInAt: string | null;
  securityLabel: string;
}

export interface EventTicketViewModel {
  organization: EventTicketOrganization;
  event: EventTicketEvent;
  attendee: EventTicketAttendee;
  ticket: EventTicketCore;
}

// ============================================================================
// Endpoints
// ============================================================================

const REGISTRATIONS_BASE = "/api/v1/registrations";
const EVENT_TICKETS_BASE = (eventId: string) => `/api/v1/events/${eventId}/tickets`;

// ============================================================================
// Query Keys
// ============================================================================

export const TICKETS_QUERY_KEYS = {
  all: ["tickets"] as const,
  ticket: (id: string, design?: TicketDesign) =>
    [...TICKETS_QUERY_KEYS.all, id, design] as const,
  byRegistration: (registrationId: string, design?: TicketDesign) =>
    [
      ...TICKETS_QUERY_KEYS.all,
      "registration",
      registrationId,
      design,
    ] as const,
  myEventTicket: (eventId: string) =>
    [...TICKETS_QUERY_KEYS.all, "my-event-ticket", eventId] as const,
} as const;

// ============================================================================
// Service
// ============================================================================

export const ticketsService = {
  /**
   * Получить билет по ID регистрации
   * GET /api/v1/registrations/:id/ticket?design=branded|simple
   */
  getTicket: async (
    id: string,
    design: TicketDesign = "branded"
  ): Promise<TicketResponse> => {
    return apiGet<TicketResponse>(
      `${REGISTRATIONS_BASE}/${id}/ticket?design=${design}`
    );
  },

  /**
   * Скачать все билеты события (организаторский endpoint)
   * POST /api/v1/events/:eventId/tickets/download-all
   */
  downloadAllTickets: async (
    eventId: string
  ): Promise<DownloadAllTicketsResponse> => {
    return apiPost<DownloadAllTicketsResponse>(
      `${EVENT_TICKETS_BASE(eventId)}/download-all`,
      {}
    );
  },

  /**
   * Получить премиум view-model моего билета на конкретное событие.
   * GET /api/v1/events/:eventId/my-ticket
   *
   * Возвращает 404, если у пользователя нет регистрации либо она не APPROVED.
   */
  getMyEventTicket: async (eventId: string): Promise<EventTicketViewModel> => {
    return apiGet<EventTicketViewModel>(
      `/api/v1/events/${eventId}/my-ticket`
    );
  },
};

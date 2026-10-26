/**
 * API: сохранённые мероприятия пользователя (USER)
 * POST/DELETE /api/v1/account/me/saved-events/:eventId
 * GET /api/v1/account/me/saved-events, GET .../check
 */

import { accountSdk } from "./sdk";

// ============================================================================
// Endpoints
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface SavedEventItem {
  id: string;
  eventId: string;
  event: {
    id: string;
    title: string;
    slug?: string;
    shortDescription?: string;
    coverImage?: string;
    startDate: string;
    endDate?: string;
    format: string;
    type: string;
    city?: string;
    organization?: { id: string; name: string; logoUrl?: string };
  };
  savedAt: string;
}

export interface SavedEventsResponse {
  items: SavedEventItem[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface SavedEventsParams {
  page?: number;
  limit?: number;
  /** Локаль для локализованных бизнес-полей события (ru/uz/en) */
  locale?: string;
}

export interface CheckSavedEventResponse {
  isSaved: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const SAVED_EVENTS_QUERY_KEYS = {
  all: ["saved-events"] as const,
  list: (params?: SavedEventsParams) =>
    [...SAVED_EVENTS_QUERY_KEYS.all, "list", params] as const,
  check: (eventId: string) =>
    [...SAVED_EVENTS_QUERY_KEYS.all, "check", eventId] as const,
} as const;

// ============================================================================
// Service
// ============================================================================

export const savedEventsService = {
  getSavedEvents: async (
    params?: SavedEventsParams
  ): Promise<SavedEventsResponse> => {
    const response = (await accountSdk.savedEvents.getSavedEvents(
      params as never
    )) as unknown as {
      data?: SavedEventItem[];
      items?: SavedEventItem[];
      total: number;
      page: number;
      limit: number;
      totalPages?: number;
    };

    return {
      items: response.items ?? response.data ?? [],
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages,
    };
  },

  saveEvent: async (eventId: string): Promise<{ success?: boolean }> => {
    await accountSdk.savedEvents.saveEvent(eventId);
    return { success: true };
  },

  unsaveEvent: async (eventId: string): Promise<{ success?: boolean }> => {
    await accountSdk.savedEvents.unsaveEvent(eventId);
    return { success: true };
  },

  checkSaved: async (eventId: string): Promise<CheckSavedEventResponse> => {
    return accountSdk.savedEvents.checkSavedEvent(
      eventId
    ) as Promise<CheckSavedEventResponse>;
  },
};

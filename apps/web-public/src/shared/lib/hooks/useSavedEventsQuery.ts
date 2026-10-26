/**
 * TanStack Query хуки для сохранённых мероприятий (USER)
 * GET /api/v1/account/me/saved-events
 * POST/DELETE /api/v1/account/me/saved-events/:eventId
 */

import {
  useQuery,
  useQueryClient,
  useMutation,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { useLocale } from "@eventflow/i18n/react";

import {
  savedEventsService,
  SAVED_EVENTS_QUERY_KEYS,
  type SavedEventsResponse,
  type SavedEventsParams,
  type CheckSavedEventResponse,
} from "@shared/api";

// ============================================================================
// Saved Events List Query
// ============================================================================

interface UseSavedEventsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  params?: SavedEventsParams;
}

export const useSavedEventsQuery = (
  options?: UseSavedEventsQueryOptions
): UseQueryResult<SavedEventsResponse, Error> => {
  const locale = useLocale();
  const params = { ...options?.params, locale };
  return useQuery<SavedEventsResponse, Error>({
    queryKey: SAVED_EVENTS_QUERY_KEYS.list(params),
    queryFn: () => savedEventsService.getSavedEvents(params),
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// Check Saved Query
// ============================================================================

export const useCheckSavedEventQuery = (
  eventId: string,
  options?: { enabled?: boolean }
): UseQueryResult<CheckSavedEventResponse, Error> => {
  return useQuery<CheckSavedEventResponse, Error>({
    queryKey: SAVED_EVENTS_QUERY_KEYS.check(eventId),
    queryFn: () => savedEventsService.checkSaved(eventId),
    staleTime: 60 * 1000,
    enabled: (options?.enabled ?? true) && Boolean(eventId),
  });
};

// ============================================================================
// Toggle Save Mutation
// ============================================================================

export const useToggleSavedEventMutation = (
  eventId: string
): UseMutationResult<{ success?: boolean }, Error, void> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["saved-events", "toggle", eventId],
    mutationFn: async () => {
      const check = await savedEventsService.checkSaved(eventId);
      if (check.isSaved) {
        return savedEventsService.unsaveEvent(eventId);
      }
      return savedEventsService.saveEvent(eventId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: SAVED_EVENTS_QUERY_KEYS.all,
      });
      void queryClient.invalidateQueries({
        queryKey: SAVED_EVENTS_QUERY_KEYS.check(eventId),
      });
    },
  });
};

export const useSaveEventMutation = (): UseMutationResult<
  { success?: boolean },
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["saved-events", "save"],
    mutationFn: (eventId: string) => savedEventsService.saveEvent(eventId),
    onSuccess: (_data, eventId) => {
      void queryClient.invalidateQueries({
        queryKey: SAVED_EVENTS_QUERY_KEYS.all,
      });
      void queryClient.invalidateQueries({
        queryKey: SAVED_EVENTS_QUERY_KEYS.check(eventId),
      });
    },
  });
};

export const useUnsaveEventMutation = (): UseMutationResult<
  { success?: boolean },
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["saved-events", "unsave"],
    mutationFn: (eventId: string) => savedEventsService.unsaveEvent(eventId),
    onSuccess: (_data, eventId) => {
      void queryClient.invalidateQueries({
        queryKey: SAVED_EVENTS_QUERY_KEYS.all,
      });
      void queryClient.invalidateQueries({
        queryKey: SAVED_EVENTS_QUERY_KEYS.check(eventId),
      });
    },
  });
};

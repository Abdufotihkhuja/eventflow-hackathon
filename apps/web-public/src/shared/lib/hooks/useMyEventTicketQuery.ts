/**
 * TanStack Query hook for the premium e-ticket view-model.
 *
 * GET /api/v1/events/:eventId/my-ticket — возвращает 404, если у пользователя
 * нет регистрации либо она не APPROVED. UI должен трактовать 404 как
 * «билет ещё не выпущен» и не показывать destructive ошибку.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  ticketsService,
  TICKETS_QUERY_KEYS,
  type EventTicketViewModel,
} from "@shared/api/ticketsService";

interface UseMyEventTicketOptions {
  enabled?: boolean;
}

export const useMyEventTicketQuery = (
  eventId: string,
  options?: UseMyEventTicketOptions
): UseQueryResult<EventTicketViewModel, Error> => {
  return useQuery<EventTicketViewModel, Error>({
    queryKey: TICKETS_QUERY_KEYS.myEventTicket(eventId),
    queryFn: () => ticketsService.getMyEventTicket(eventId),
    enabled: (options?.enabled ?? true) && Boolean(eventId),
    // QR ротируется редко (только при revoke/секрет ротации) — кешируем 10 минут.
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : "";
      if (/404/.test(message) || /not found/i.test(message)) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export type { EventTicketViewModel };

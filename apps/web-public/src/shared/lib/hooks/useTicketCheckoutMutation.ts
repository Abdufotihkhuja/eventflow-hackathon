/**
 * TanStack Query мутация чекаута билета (M-4 / P-15).
 * POST /api/v1/registrations/{registrationId}/ticket-order
 *
 * Отдельного GET-эндпоинта заказа НЕТ: повторный вызов чекаута идемпотентно
 * возвращает живой заказ, поэтому «Обновить статус» в UI — это re-mutate
 * той же мутации, а не отдельный query.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { EVENT_QUERY_KEYS } from "@shared/api/eventService";
import {
  registrationService,
  TICKET_ALREADY_PAID_CODE,
  type TicketOrder,
  type TicketOrderStatus,
} from "@shared/api/registrationService";
import { USER_EVENTS_QUERY_KEYS } from "@shared/api/userEventsService";
import { ApiError } from "@shared/lib/apiClient";

export const TICKET_CHECKOUT_MUTATION_KEY = [
  "billing",
  "ticket-checkout",
] as const;

/**
 * 409 TICKET_ALREADY_PAID — у покупателя уже оплаченный билет; для UI это
 * терминальный успех (ветка «Билет оплачен»), не ошибка. Строго по code.
 */
export const isTicketAlreadyPaidError = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status === 409 &&
  error.data.code === TICKET_ALREADY_PAID_CODE;

export const useTicketCheckoutMutation = (): UseMutationResult<
  TicketOrder,
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: TICKET_CHECKOUT_MUTATION_KEY,
    mutationFn: (registrationId: string) =>
      registrationService.checkoutTicket(registrationId),
    // Глобальный default mutations.retry повторил бы и детерминированные
    // 400/404/409 — чекаут шлём строго один раз за клик.
    retry: false,
    onSuccess: (order) => {
      if (order.status === "PAID") {
        // Оператор подтвердил оплату → регистрация стала APPROVED на бэке;
        // сбрасываем детали события (myRegistration) и «мои события».
        void queryClient.invalidateQueries({
          queryKey: EVENT_QUERY_KEYS.details(),
        });
        void queryClient.invalidateQueries({
          queryKey: USER_EVENTS_QUERY_KEYS.all,
        });
      }
    },
  });
};

export type { TicketOrder, TicketOrderStatus };

"use client";

/**
 * /profile/tickets/[eventId] — premium e-ticket страница.
 *
 * Ticket выдаётся бэкендом только при APPROVED регистрации. На любые
 * 4xx состояния показываем дружелюбный empty-state, а не destructive ошибку.
 *
 * Backend возвращает структурный `code` в теле 404 (см. TicketViewService),
 * фронт не должен парсить текст сообщения — копируем код напрямую в reason.
 */
import { use } from "react";

import { useRouter } from "next/navigation";

import { useT } from "@eventflow/i18n/react";

import { ApiError } from "@shared/lib/apiClient";
import { useMyEventTicketQuery } from "@shared/lib/hooks";
import {
  PremiumTicketCard,
  PremiumTicketEmpty,
  PremiumTicketSkeleton,
  type PremiumTicketEmptyProps,
} from "@widgets/ticket/premium-ticket-card";

interface PageParams {
  eventId: string;
}

export default function ProfileTicketPage({
  params,
}: {
  params: Promise<PageParams>;
}): React.ReactNode {
  const { eventId } = use(params);
  const router = useRouter();
  const t = useT();

  const { data, isLoading, isError, error } = useMyEventTicketQuery(eventId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <PremiumTicketSkeleton />
      </div>
    );
  }

  if (isError) {
    const reason = mapErrorToReason(error);
    const message =
      reason === "unknown" && error instanceof Error ? error.message : undefined;
    return (
      <div className="mx-auto max-w-4xl">
        <PremiumTicketEmpty
          reason={reason}
          message={message}
          onPrimaryAction={() => router.push("/profile/events")}
          primaryActionLabel={t("ticket.empty.backToEvents")}
        />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PremiumTicketCard data={data} />
    </div>
  );
}

/**
 * Maps backend `code` (from {@link ApiError.data}) to the empty-state reason
 * the UI knows how to render. Backend codes are the source of truth — we
 * never parse human-readable messages.
 */
function mapErrorToReason(error: unknown): PremiumTicketEmptyProps["reason"] {
  if (!(error instanceof ApiError)) return "unknown";

  switch (error.data.code) {
    case "pending_review":
    case "not_approved":
      return "pending";
    case "cancelled":
    case "rejected":
      return "cancelled";
    case "not_registered":
      return "not_registered";
    default:
      return error.status === 404 ? "not_registered" : "unknown";
  }
}

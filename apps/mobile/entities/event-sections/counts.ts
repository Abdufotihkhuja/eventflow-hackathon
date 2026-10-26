/**
 * Counts for the event section rail.
 *
 * Every query here uses the SAME key and fetcher as the section screen it
 * counts, so react-query serves the badge from the cache the screen already
 * filled instead of asking twice: standing on «Программа», its badge is free,
 * and the other sections cost one small request each.
 *
 * Sections without a badge are deliberate, not missing:
 *  · «Обзор» and «Аналитика» count nothing — they ARE the summary;
 *  · «Посещаемость», «Сертификаты» and «Бейджи» would need a heavier request
 *    whose number changes only during the event itself, so the rail stays quiet
 *    rather than firing three more calls on every screen.
 *
 * A failed or forbidden query yields `undefined`, and `undefined` renders NO
 * badge — a section the user cannot read must not show a confident "0".
 */
import { useQueries } from "@tanstack/react-query";

import { agendaKeys, fetchAgenda } from "@entities/agenda";
import { commentKeys, fetchEventComments } from "@entities/event-comments";
import { fetchQuestions, questionKeys } from "@entities/event-questions";
import { fetchSpeakers, speakerKeys } from "@entities/speakers";
import { apiTransport } from "@shared/api";

import type { EventSectionKey } from "@shared/ui";

export type SectionCounts = Partial<Record<EventSectionKey, number>>;

/** The registrations list is paginated, so one row is enough to learn `total`. */
async function fetchAttendeeTotal(eventId: string): Promise<number> {
  const res = (await apiTransport({
    method: "GET",
    url: `/api/v1/events/${eventId}/registrations?limit=1`,
  })) as { total?: number; data?: unknown[] } | null;
  return res?.total ?? (Array.isArray(res?.data) ? res.data.length : 0);
}

const registrationTotalKey = (eventId: string) => ["event-registrations-total", eventId] as const;

export function useEventSectionCounts(eventId: string | undefined): SectionCounts {
  const enabled = Boolean(eventId);
  const id = eventId ?? "";

  // A minute of staleness is right for a badge: it is a glanceable number, not
  // a live counter, and refetching it on every rail mount would turn moving
  // between sections into a burst of requests.
  const staleTime = 60_000;

  const results = useQueries({
    queries: [
      { queryKey: registrationTotalKey(id), queryFn: () => fetchAttendeeTotal(id), enabled, staleTime },
      { queryKey: agendaKeys.list(id), queryFn: () => fetchAgenda(id), enabled, staleTime },
      { queryKey: speakerKeys.list(id), queryFn: () => fetchSpeakers(id), enabled, staleTime },
      { queryKey: questionKeys.list(id), queryFn: () => fetchQuestions(id), enabled, staleTime },
      { queryKey: commentKeys.list(id), queryFn: () => fetchEventComments(id), enabled, staleTime },
    ],
  });

  const [attendees, agenda, speakers, questions, comments] = results;

  /** Comments arrive as a tree — a reply is a comment too. */
  const commentTotal = comments.data?.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

  return {
    attendees: typeof attendees.data === "number" ? attendees.data : undefined,
    agenda: agenda.data?.length,
    speakers: speakers.data?.length,
    questions: questions.data?.length,
    comments: commentTotal,
  };
}

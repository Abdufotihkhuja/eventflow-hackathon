/**
 * Event speakers (org session) — the mobile half of the web cabinet's «Спикеры».
 *
 * Two ways a speaker gets on the bill, both of which the API supports and both
 * of which matter on a phone: added by hand (the organizer types the details) or
 * invited by email (the speaker fills their own profile in through a tokenized
 * link). The invitation status is the one thing an organizer checks from a
 * phone, so it is surfaced on every card rather than hidden behind a detail
 * sheet.
 *
 * Not built here: avatar upload with a cropper and reordering — both are desk
 * work, and neither blocks running the event.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

/** `SpeakerInvitationStatus` in the Prisma schema — UPPERCASE, and `NONE`
 *  means "added by hand, never invited". There is no EXPIRED state server-side. */
export type SpeakerInviteStatus = "NONE" | "PENDING" | "ACCEPTED" | "REJECTED";

export interface Speaker {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  company?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  invitationStatus?: SpeakerInviteStatus | null;
  position_?: number | null;
}

export interface SpeakerInput {
  firstName: string;
  lastName?: string;
  position?: string;
  company?: string;
  bio?: string;
}

export const speakerKeys = {
  all: ["speakers"] as const,
  list: (eventId: string) => ["speakers", eventId] as const,
};

function listOf(raw: unknown): Speaker[] {
  if (Array.isArray(raw)) return raw as Speaker[];
  const data = (raw as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as Speaker[]) : [];
}

/** Shared with the section rail's badge — same cache entry, no second fetch. */
export async function fetchSpeakers(eventId: string): Promise<Speaker[]> {
  return listOf(await apiTransport({ method: "GET", url: `/api/v1/events/${eventId}/speakers` }));
}

export function useSpeakersQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: speakerKeys.list(eventId ?? ""),
    queryFn: () => fetchSpeakers(eventId ?? ""),
    enabled: Boolean(eventId),
  });
}

export function useCreateSpeakerMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SpeakerInput) =>
      apiTransport({ method: "POST", url: `/api/v1/events/${eventId}/speakers`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: speakerKeys.list(eventId) }),
  });
}

export function useUpdateSpeakerMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: SpeakerInput & { id: string }) =>
      apiTransport({ method: "PATCH", url: `/api/v1/events/${eventId}/speakers/${id}`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: speakerKeys.list(eventId) }),
  });
}

export function useDeleteSpeakerMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiTransport({ method: "DELETE", url: `/api/v1/events/${eventId}/speakers/${id}` }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: speakerKeys.list(eventId) }),
  });
}

export function useInviteSpeakerMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; firstName?: string; lastName?: string }) =>
      apiTransport({ method: "POST", url: `/api/v1/events/${eventId}/speakers/invite`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: speakerKeys.list(eventId) }),
  });
}

export function useResendSpeakerInviteMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (speakerId: string) =>
      apiTransport({
        method: "POST",
        url: `/api/v1/events/${eventId}/speakers/${speakerId}/resend-invitation`,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: speakerKeys.list(eventId) }),
  });
}

export function speakerFullName(s: Speaker): string {
  return [s.firstName, s.lastName].filter(Boolean).join(" ").trim();
}

export function speakerSubtitle(s: Speaker): string {
  return [s.position, s.company].filter(Boolean).join(" · ");
}

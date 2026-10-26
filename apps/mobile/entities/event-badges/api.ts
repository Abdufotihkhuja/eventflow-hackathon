/**
 * Event badge templates (org session) — the mobile half of the web cabinet's
 * «Бейджи».
 *
 * Deliberately READ + DELETE only. Creating a template means uploading an image,
 * cropping it to a millimetre-accurate print preset and positioning six fields
 * on a canvas; that is desk work, and a badge laid out by dragging on a 400pt
 * screen would go to the printer wrong. What a phone genuinely answers is
 * "is there a template for every role, or will the badge run fail tomorrow?" —
 * so the list leads with the role each template covers.
 *
 * The ZIP download is likewise left to the cabinet: a ZIP of print-ready PDFs
 * has nowhere useful to go on a phone.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export type BadgeRole = "PARTICIPANT" | "SPEAKER" | "MENTOR";

export interface BadgeTemplate {
  id: string;
  eventId: string;
  name: string;
  recipientRole?: BadgeRole | null;
  roleCode?: string | null;
  roleDisplayName?: string | null;
  sizePreset?: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
  templateUrl?: string | null;
  thumbnailUrl?: string | null;
  isDefault?: boolean | null;
}

export const badgeKeys = {
  all: ["event-badges"] as const,
  templates: (eventId: string) => ["event-badges", eventId] as const,
};

export function useBadgeTemplatesQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: badgeKeys.templates(eventId ?? ""),
    queryFn: async (): Promise<BadgeTemplate[]> => {
      const raw = (await apiTransport({
        method: "GET",
        url: `/api/v1/events/${eventId}/badges/templates`,
      })) as { templates?: BadgeTemplate[] } | BadgeTemplate[] | null;
      if (Array.isArray(raw)) return raw;
      return Array.isArray(raw?.templates) ? raw.templates : [];
    },
    enabled: Boolean(eventId),
  });
}

export function useDeleteBadgeTemplateMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      apiTransport({ method: "DELETE", url: `/api/v1/events/${eventId}/badges/templates/${templateId}` }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: badgeKeys.templates(eventId) }),
  });
}

/** Roles the event can hand a badge to, and whether a template covers each —
 *  the one question worth answering on a phone. */
export function roleCoverage(templates: BadgeTemplate[]): { role: BadgeRole; covered: boolean }[] {
  const roles: BadgeRole[] = ["PARTICIPANT", "SPEAKER", "MENTOR"];
  return roles.map((role) => ({
    role,
    covered: templates.some((tpl) => tpl.recipientRole === role),
  }));
}

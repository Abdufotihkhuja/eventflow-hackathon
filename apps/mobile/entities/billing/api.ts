/**
 * Plan entitlements for the active workspace (`GET /billing/entitlements`).
 *
 * The API's own contract note is the rule this entity exists to enforce:
 * **the client NEVER makes the decision — enforcement is server-side.**
 * Everything here is a UX hint. Use it to explain a limit before the user hits
 * it, or to mark a feature as not-in-your-plan; never to silently allow
 * something the server would refuse, and never to hard-block an action the
 * server would in fact accept. When the two disagree, the server is right.
 *
 * `enforcementEnabled: false` means limits are not being applied yet (the
 * pricing rollout is staged) — screens should stay quiet in that case rather
 * than nagging about a ceiling nobody is enforcing.
 */
import { useQuery } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export interface UsageMeter {
  limit: number | null;
  used: number;
  periodKey: string | null;
}

export interface EventCredits {
  granted: number;
  remaining: number;
}

export interface Entitlements {
  tierKey: string;
  source: "PURCHASE" | "DEFAULT";
  enforcementEnabled: boolean;
  suspended: boolean;
  staffSeats: number | null;
  maxParticipantsPerEvent: number | null;
  maxEvents: number | null;
  /** Gates the kanban feature — the design's locked-state (2.4). */
  taskBoardEnabled: boolean;
  statsTier: string;
  eventCredits: EventCredits | null;
  generations: UsageMeter;
  aiSeconds: UsageMeter;
}

export const billingKeys = {
  all: ["billing"] as const,
  entitlements: (orgId: string) => ["billing", "entitlements", orgId] as const,
};

export function useEntitlementsQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: billingKeys.entitlements(orgId ?? ""),
    queryFn: async (): Promise<Entitlements> =>
      (await apiTransport({ method: "GET", url: "/api/v1/billing/entitlements" })) as Entitlements,
    enabled: Boolean(orgId),
    // A missing BILLING_VIEW permission 403s here. That is not an error the
    // user needs to see — a staff member without billing rights simply gets no
    // plan hints, so the query stays quiet instead of retrying.
    retry: false,
  });
}

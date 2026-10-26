/**
 * Organizer dashboard data hooks (W6): KPI stats + 24h team activity, both
 * org-scoped — they run on the workspace session token, so every hook is
 * gated on an active workspace (`enabled`).
 *
 * Contract gotchas (backend-recon, baked in here so screens can't misuse):
 *   • `tickets` counts KANBAN TASKS — label it "Tasks", never "Tickets".
 *   • `period` / `timeAgo` / `description` arrive pre-formatted in RUSSIAN —
 *     screens must rebuild copy from `type` + `entityName` + `createdAt`.
 */
import { useQuery } from "@tanstack/react-query";

import { workspaceSdk } from "@shared/api";

/** DashboardStatsDto (typed in the generated contract). */
export interface OrgDashboardStats {
  events: {
    active: { value: number; changePercent: number; changeAbsolute: number; period: string };
    total: number;
    drafts: number;
    completed: number;
  };
  /** Kanban board tasks — NOT event tickets. */
  tickets: {
    open: { value: number; changePercent: number; changeAbsolute: number; period: string };
    total: number;
    completed: number;
  };
  participants: { newCount: number; momChangePercent: number; total: number };
  conversion: {
    registrationRate: number;
    attendanceRate: number;
    totalRegistrations: number;
    approvedRegistrations: number;
  };
}

export type OrgActivityType =
  | "REGISTRATION"
  | "EVENT_CREATED"
  | "EVENT_PUBLISHED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "MEMBER_JOINED";

export interface OrgActivityItem {
  id: string;
  type: OrgActivityType;
  /** Pre-formatted RUSSIAN — do not render; rebuild from type + entityName. */
  description: string;
  entityName: string;
  entityId?: string;
  /** Real timestamp — the source for client-side localized relative time. */
  createdAt: string;
  /** Pre-formatted RUSSIAN — do not render. */
  timeAgo: string;
}

export const orgDashboardKeys = {
  all: ["org-dashboard"] as const,
  stats: (orgId: string) => ["org-dashboard", "stats", orgId] as const,
  activity: (orgId: string) => ["org-dashboard", "activity", orgId] as const,
};

export function useOrgDashboardStatsQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: orgDashboardKeys.stats(orgId ?? ""),
    queryFn: async () =>
      (await workspaceSdk.dashboard.getStats()) as unknown as OrgDashboardStats,
    enabled: Boolean(orgId),
  });
}

export function useOrgActivityQuery(orgId: string | undefined, limit = 12) {
  return useQuery({
    queryKey: orgDashboardKeys.activity(orgId ?? ""),
    queryFn: async () => {
      const res = (await workspaceSdk.dashboard.getActivity({ limit })) as unknown as {
        items?: OrgActivityItem[];
        totalCount?: number;
      };
      return { items: res?.items ?? [], totalCount: res?.totalCount ?? 0 };
    },
    enabled: Boolean(orgId),
  });
}

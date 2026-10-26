/**
 * Profile data hooks — the participant's event-participation stats (events
 * attended, certificates earned) powering the Profile header tiles. Identity
 * itself comes from the auth context (`getMe`), not a query.
 */
import { useQuery } from "@tanstack/react-query";

import { accountSdk } from "@shared/api";

export const profileKeys = {
  eventStats: ["profile", "event-stats"] as const,
};

export function useUserEventsStatsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: profileKeys.eventStats,
    queryFn: () => accountSdk.userEvents.getUserEventsStats(),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

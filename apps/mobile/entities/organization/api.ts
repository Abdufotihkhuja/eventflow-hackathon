/**
 * Organization data hooks: public profile, the org's events (upcoming/past),
 * the signed-in account's own organizations (mode switcher), and an optimistic
 * follow/unfollow that patches the cached profile so the button + follower
 * count update instantly.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountSdk, publicSdk } from "@shared/api";
import type { OrgSummary } from "@shared/auth";

export type OrgEventStatus = "upcoming" | "past";

export const organizationKeys = {
  all: ["organizations"] as const,
  profile: (id: string) => ["organizations", "profile", id] as const,
  events: (id: string, status: OrgEventStatus) =>
    ["organizations", "events", id, status] as const,
  /** GET /me/organizations — the account's own memberships (mode switcher). */
  mine: ["me", "organizations"] as const,
};

/** The organizations the signed-in account belongs to (W5 mode switcher). */
export function useMyOrganizationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: organizationKeys.mine,
    queryFn: async () =>
      ((await accountSdk.me.organizations()) ?? []) as unknown as OrgSummary[],
    enabled: options?.enabled ?? true,
  });
}

export function useOrgProfileQuery(id: string | undefined) {
  return useQuery({
    queryKey: organizationKeys.profile(id ?? ""),
    queryFn: () => publicSdk.organizations.getPublicProfile(id as string),
    enabled: Boolean(id),
  });
}

export function useOrgEventsQuery(id: string | undefined, status: OrgEventStatus) {
  return useQuery({
    queryKey: organizationKeys.events(id ?? "", status),
    queryFn: () =>
      // NB: this endpoint whitelists query params — `locale`/`filter` are
      // rejected (400). Titles come back multilingual; localize at render.
      publicSdk.events.getByOrganization(id as string, {
        status,
        limit: 12,
      } as never),
    enabled: Boolean(id),
    // Tab switches re-key the query; keep the previous tab's list rendered
    // instead of tearing down to skeletons (per-tab placeholderData).
    placeholderData: keepPreviousData,
  });
}

interface ProfileCache {
  isFollowing?: boolean;
  followersCount?: number;
}

export function useFollowOrgMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (next: boolean) =>
      next
        ? accountSdk.followingOrganizations.follow(id)
        : accountSdk.followingOrganizations.unfollow(id),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: organizationKeys.profile(id) });
      const prev = qc.getQueryData(organizationKeys.profile(id));
      qc.setQueryData<ProfileCache>(organizationKeys.profile(id), (old) => {
        if (!old) return old;
        const followers = typeof old.followersCount === "number" ? old.followersCount : 0;
        return { ...old, isFollowing: next, followersCount: Math.max(0, followers + (next ? 1 : -1)) };
      });
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(organizationKeys.profile(id), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: organizationKeys.profile(id) });
    },
  });
}

/**
 * The ACTIVE workspace's own organization record — `GET /workspace/me` — plus
 * the two mutations the organizer app may make against it: the profile fields
 * (`PATCH /workspace/me`) and the logo (`POST` / `DELETE /workspace/me/logo`).
 *
 * This is deliberately a SECOND organization source next to `./api.ts`. That one
 * fetches `GET /organizations/:id/public` — what a visitor sees, and it carries
 * neither the phone, the INN, nor the reason a verification was rejected. This
 * one is what the organization sees about itself. The org tab needs both: the
 * private record to edit, the public one for the follower/event counts a visitor
 * would see.
 *
 * PERMISSION: all three endpoints are `@Roles(ORGANIZATION)` — a staff MEMBER
 * token gets a 403. Screens gate the edit affordance on `workspace.isOwner`;
 * the server is still the authority, and a 403 here is surfaced, never guessed.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceSdk } from "@shared/api";

import { organizationKeys } from "./api";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

/** The org's own record. Empty strings are normalized to `undefined` so a
 *  screen can ask `if (org.phone)` without also testing for `""`. */
export interface WorkspaceOrg {
  id: string;
  /** Public-facing name (the API's `organizationName` = `companyName`). */
  name: string;
  email?: string;
  inn?: string;
  description?: string;
  phone?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  industry?: string;
  companySize?: number;
  verificationStatus: VerificationStatus;
  /** Only set when `verificationStatus === "REJECTED"` — the one thing that
   *  tells an owner what to fix. Nothing on mobile showed it before. */
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
}

/** Fields this app is allowed to write. `industry`/`companySize` exist on the
 *  DTO but belong to the web onboarding form, not to a phone. */
export interface WorkspaceOrgPatch {
  organizationName?: string;
  description?: string;
  phone?: string;
  address?: string;
  website?: string;
}

function text(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function toWorkspaceOrg(raw: unknown): WorkspaceOrg {
  // CONTRACT-GAP: read loosely — the generated response type is a union of
  // loose/optional fields, and `verificationStatus` widens to `string`.
  const d = (raw ?? {}) as Record<string, unknown>;
  const status = typeof d.verificationStatus === "string" ? d.verificationStatus : "PENDING";
  return {
    id: String(d.id ?? ""),
    name: text(d.organizationName) ?? text(d.name) ?? "—",
    email: text(d.email),
    inn: text(d.inn),
    description: text(d.description),
    phone: text(d.phone),
    address: text(d.address),
    website: text(d.website),
    logoUrl: text(d.logoUrl),
    industry: text(d.industry),
    companySize: typeof d.companySize === "number" ? d.companySize : undefined,
    verificationStatus: (status === "APPROVED" || status === "REJECTED" ? status : "PENDING") as VerificationStatus,
    rejectionReason: text(d.rejectionReason),
    verifiedAt: text(d.verifiedAt),
    createdAt: text(d.createdAt),
  };
}

export const workspaceOrgKey = (orgId: string): readonly string[] => [
  ...organizationKeys.all,
  "workspace",
  orgId,
];

/** The signed-in workspace's own organization record. */
export function useWorkspaceOrgQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: workspaceOrgKey(orgId ?? ""),
    queryFn: async (): Promise<WorkspaceOrg> =>
      toWorkspaceOrg(await workspaceSdk.auth.getOrganizationMe()),
    enabled: Boolean(orgId),
    // A staff MEMBER token 403s here. That is a permission fact, not a network
    // blip — retrying only delays the screen's fallback to the public profile.
    retry: false,
  });
}

/** Patch the org profile. The response IS the new record, so the cache is
 *  written from it rather than invalidated into a second round-trip. */
export function useUpdateWorkspaceOrgMutation(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: WorkspaceOrgPatch): Promise<WorkspaceOrg> =>
      toWorkspaceOrg(await workspaceSdk.auth.updateOrganizationProfile(patch as never)),
    onSuccess: (org) => {
      qc.setQueryData(workspaceOrgKey(orgId ?? ""), org);
      // The public profile mirrors name/description/website/address, and the
      // switcher's row is built from `/me/organizations` — both are now stale.
      void qc.invalidateQueries({ queryKey: organizationKeys.profile(orgId ?? "") });
      void qc.invalidateQueries({ queryKey: organizationKeys.mine });
    },
  });
}

/** Upload a new logo, or pass `null` to remove the current one. */
export function useWorkspaceLogoMutation(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string } | null): Promise<WorkspaceOrg> => {
      if (!file) return toWorkspaceOrg(await workspaceSdk.auth.deleteOrganizationLogo());
      // React Native's FormData takes a `{uri,name,type}` part, not a DOM File —
      // the SDK types it as `File` because it is shared with the web apps.
      return toWorkspaceOrg(await workspaceSdk.auth.uploadOrganizationLogo(file as unknown as File));
    },
    onSuccess: (org) => {
      qc.setQueryData(workspaceOrgKey(orgId ?? ""), org);
      void qc.invalidateQueries({ queryKey: organizationKeys.profile(orgId ?? "") });
      void qc.invalidateQueries({ queryKey: organizationKeys.mine });
    },
  });
}

/**
 * Org team data hooks (W8) — members, pending invites, and the roles catalog,
 * all org-scoped (they run on the workspace session token, so every hook is
 * gated on an active workspace via `enabled`). Invite create/resend/revoke are
 * mutations that invalidate the invite list.
 *
 * SECURITY: members come ONLY from `workspaceSdk.team.getMembers`, which
 * sanitizes each row through the field whitelist (`sanitizeMember`) at the SDK
 * boundary. Screens map them via `toTeamMemberVM` and never touch a raw row.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceSdk } from "@shared/api";

import {
  toInviteVM,
  toRoleOption,
  toTeamMemberVM,
  type InviteVM,
  type RoleOption,
  type TeamMemberVM,
} from "./model";

export const orgTeamKeys = {
  all: ["org-team"] as const,
  members: (orgId: string) => ["org-team", "members", orgId] as const,
  invites: (orgId: string) => ["org-team", "invites", orgId] as const,
  roles: (orgId: string) => ["org-team", "roles", orgId] as const,
};

/** Whitelisted org members (already sanitized at the wrapper). */
export function useTeamMembersQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: orgTeamKeys.members(orgId ?? ""),
    queryFn: async (): Promise<TeamMemberVM[]> => {
      const rows = await workspaceSdk.team.getMembers();
      return rows.map(toTeamMemberVM);
    },
    enabled: Boolean(orgId),
  });
}

/** Pending / historical invites for the org. */
export function useOrgInvitesQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: orgTeamKeys.invites(orgId ?? ""),
    queryFn: async (): Promise<InviteVM[]> => {
      const res = (await workspaceSdk.invites.list()) as unknown;
      const arr = Array.isArray(res) ? res : ((res as { data?: unknown[] })?.data ?? []);
      return arr.map(toInviteVM);
    },
    enabled: Boolean(orgId),
  });
}

/** Roles catalog for the invite sheet's role picker. */
export function useOrgRolesQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: orgTeamKeys.roles(orgId ?? ""),
    queryFn: async (): Promise<RoleOption[]> => {
      const res = (await workspaceSdk.roles.list()) as unknown;
      const arr = Array.isArray(res) ? res : ((res as { data?: unknown[] })?.data ?? []);
      return arr.map((r) => toRoleOption(r as never));
    },
    enabled: Boolean(orgId),
  });
}

export interface CreateInviteInput {
  email: string;
  roleId: string;
  firstName?: string;
  lastName?: string;
}

function invalidateInvites(qc: ReturnType<typeof useQueryClient>, orgId: string) {
  void qc.invalidateQueries({ queryKey: orgTeamKeys.invites(orgId) });
}

export function useCreateInviteMutation(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInviteInput) => workspaceSdk.invites.create(input as never),
    onSuccess: () => invalidateInvites(qc, orgId),
  });
}

export function useResendInviteMutation(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => workspaceSdk.invites.resend(inviteId),
    onSuccess: () => invalidateInvites(qc, orgId),
  });
}

export function useRevokeInviteMutation(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => workspaceSdk.invites.revoke(inviteId),
    onSuccess: () => invalidateInvites(qc, orgId),
  });
}

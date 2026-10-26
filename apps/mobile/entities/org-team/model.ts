/**
 * Team view-model adapters (W8). Members arrive as `SafeWorkspaceMember` —
 * ALREADY field-whitelisted at the sdk-workspace boundary (`sanitizeMember`),
 * so no sensitive field (passwordHash / invitationToken / tokenExpiresAt) can
 * reach here. We still never spread a raw row into the UI: screens read only
 * the named fields below.
 *
 * Role labels: the backend seeds a small catalog of SYSTEM roles with canonical
 * English names (Owner / Admin / Editor / Door staff / …). Those map to
 * localized strings; any custom org role falls back to its raw name.
 */
import type { SafeWorkspaceMember, WorkspaceRoleSummary } from "@eventflow/sdk-workspace";

import { hueFromId } from "@shared/lib/format";

import type { StringKey } from "@shared/i18n/strings";

/** A member as the team UI consumes it — derived, presentation-only fields. */
export interface TeamMemberVM {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  /** Localizable role: `roleKey` when a known system role, else `roleRaw`. */
  roleKey?: StringKey;
  roleRaw: string | null;
  /** INVITED / ACTIVE / … — used to dim not-yet-active members. */
  status: string | null;
  avatarUrl?: string;
  hue: number;
}

/** A pending invite row (design 22 §5.5 "Invite sent · pending"). */
export interface InviteVM {
  id: string;
  email: string;
  /** PENDING / ACCEPTED / EXPIRED / REVOKED. */
  status: string;
  roleKey?: StringKey;
  roleRaw: string;
  hue: number;
}

/** Canonical system-role name → i18n key. Case-insensitive; hyphen/space-loose. */
const ROLE_KEYS: Record<string, StringKey> = {
  owner: "org.team.role.owner",
  admin: "org.team.role.admin",
  administrator: "org.team.role.admin",
  editor: "org.team.role.editor",
  manager: "org.team.role.manager",
  "door staff": "org.team.role.doorStaff",
  doorstaff: "org.team.role.doorStaff",
  door: "org.team.role.doorStaff",
  member: "org.team.role.member",
  viewer: "org.team.role.viewer",
};

/** Resolve a raw role name to a localizable key, or undefined for custom roles. */
export function roleKeyForName(name?: string | null): StringKey | undefined {
  if (!name) return undefined;
  return ROLE_KEYS[name.trim().toLowerCase()];
}

function nameOf(m: SafeWorkspaceMember): string {
  return [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email || "—";
}

function initialsOf(m: SafeWorkspaceMember): string {
  const a = m.firstName?.trim()?.[0] ?? "";
  const b = m.lastName?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || m.email?.[0]?.toUpperCase() || "•";
}

export function toTeamMemberVM(m: SafeWorkspaceMember): TeamMemberVM {
  const name = nameOf(m);
  return {
    id: m.id,
    name,
    initials: initialsOf(m),
    email: m.email,
    roleKey: roleKeyForName(m.roleName),
    roleRaw: m.roleName,
    status: m.status,
    avatarUrl: m.avatarUrl ?? undefined,
    hue: hueFromId(m.id || name),
  };
}

/** Loose invite row (contract types `firstName`/`lastName` as `Record` — read
 *  only what we render: id, email, status, role). */
export function toInviteVM(raw: unknown): InviteVM {
  const r = (raw ?? {}) as {
    id?: string;
    email?: string;
    status?: string;
    role?: { id?: string; name?: string } | null;
  };
  const roleRaw = r.role?.name ?? "";
  return {
    id: r.id ?? "",
    email: r.email ?? "",
    status: r.status ?? "PENDING",
    roleKey: roleKeyForName(roleRaw),
    roleRaw,
    hue: hueFromId(r.id || r.email || ""),
  };
}

/** A selectable role for the invite sheet's role picker. */
export interface RoleOption {
  id: string;
  roleKey?: StringKey;
  roleRaw: string;
}

export function toRoleOption(r: WorkspaceRoleSummary): RoleOption {
  return { id: r.id, roleKey: roleKeyForName(r.name), roleRaw: r.name };
}

/**
 * What the signed-in member may actually do.
 *
 * `/me/organizations` already ships the membership's permission codes and its
 * owner flag, so this costs no request — it just stops the UI from lying. A
 * read-only manager used to see every "+" and every «Удалить», fill a whole
 * sheet in, and learn the truth only from the server's 403 on save.
 *
 * The client NEVER decides access: the server does, and it re-checks every
 * call. This only decides what to OFFER. Anything hidden here is still refused
 * server-side if it is somehow reached (a deep link, a stale screen).
 */
import { useAuth } from "./auth-context";

/** Codes as they are spelled in the API's PERMISSIONS constant. */
export const PERM = {
  eventsRead: "events:read",
  eventsUpdate: "events:update",
  eventsCreate: "events:create",
  eventsDelete: "events:delete",
  certificatesRead: "certificates:read",
  certificatesGenerate: "certificates:generate",
  certificatesExport: "certificates:export",
  attendanceCheckin: "attendance:checkin",
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];

export function useHasPermission(): (code: PermissionCode) => boolean {
  const { workspace } = useAuth();
  return (code) => {
    if (!workspace) return false;
    // The owner is not enumerated permission by permission on the server; the
    // role simply outranks the list.
    if (workspace.isOwner) return true;
    return workspace.permissions?.includes(code) ?? false;
  };
}

/** Shorthand for the one question most section screens ask: may I change the
 *  event's content (agenda, speakers, questions)? */
export function useCanEditEvent(): boolean {
  const has = useHasPermission();
  return has(PERM.eventsUpdate);
}

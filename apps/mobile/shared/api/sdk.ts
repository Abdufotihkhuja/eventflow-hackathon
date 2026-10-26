/**
 * The generated SDKs, bound to the app's single transport. These are the ONLY
 * data entry points — screens/entities call `publicSdk.*` / `accountSdk.*`,
 * never `fetch`. If a needed method is missing here, that is contract drift:
 * STOP and report it (MOBILE_API.md §5) — do not hand-roll a request.
 */
import { createAccountSdk } from "@eventflow/sdk-account";
import { createPublicSdk } from "@eventflow/sdk-public";
// NB: @eventflow/sdk-workspace is deliberately NOT listed in
// apps/mobile/package.json — it resolves through the root npm-workspaces
// node_modules symlink (like every @eventflow/* package), so `npm ci` stays
// green. Runtime loads the package's built dist/ (W6 SDK build session).
import { createWorkspaceSdk } from "@eventflow/sdk-workspace";

import { apiTransport } from "./transport";

export const publicSdk = createPublicSdk(apiTransport);
export const accountSdk = createAccountSdk(apiTransport);
/** Org-scoped SDK — call ONLY inside an active workspace session (the
 *  transport then carries the org/member token from `enterWorkspace`). */
export const workspaceSdk = createWorkspaceSdk(apiTransport);

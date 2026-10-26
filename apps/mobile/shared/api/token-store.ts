/**
 * Session token storage.
 *
 * Tokens live in `expo-secure-store` on native (Keychain / Keystore) and in
 * `localStorage` on web (SecureStore is unavailable there). NEVER store tokens
 * in AsyncStorage, logs, or analytics (MOBILE_API.md §1.2).
 *
 *   ef.auth.access  — access JWT (15m)
 *   ef.auth.refresh — opaque refresh token (7d, single-use/rotated)
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "ef.auth.access";
const REFRESH_KEY = "ef.auth.refresh";
// While in an organization workspace, the active token (above) holds the
// org-scoped token and the personal session is stashed here so we can restore
// it on "switch back". Boot always restores personal first (no stranding).
const P_ACCESS_KEY = "ef.personal.access";
const P_REFRESH_KEY = "ef.personal.refresh";
/** Organization id of the workspace the user was last inside (see setActiveOrg). */
const ACTIVE_ORG_KEY = "ef.workspace.org";

const isWeb = Platform.OS === "web";

async function read(key: string): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* best-effort persistence */
  }
}

async function remove(key: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    /* best-effort */
  }
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStore = {
  getAccess: () => read(ACCESS_KEY),
  getRefresh: () => read(REFRESH_KEY),
  async getTokens(): Promise<SessionTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      read(ACCESS_KEY),
      read(REFRESH_KEY),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  async setTokens({ accessToken, refreshToken }: SessionTokens): Promise<void> {
    await Promise.all([
      write(ACCESS_KEY, accessToken),
      write(REFRESH_KEY, refreshToken),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([
      remove(ACCESS_KEY),
      remove(REFRESH_KEY),
      remove(P_ACCESS_KEY),
      remove(P_REFRESH_KEY),
      // Signing out must also forget WHICH workspace was open — otherwise the
      // next account to sign in on this device would be re-entered into the
      // previous user's organization on boot.
      remove(ACTIVE_ORG_KEY),
    ]);
  },

  // ── workspace session stash ────────────────────────────────────────────────
  /** Copy the active (personal) tokens into the stash before entering a workspace. */
  async stashPersonal(): Promise<void> {
    // Never overwrite an existing stash: if one is present, the active slot may
    // already hold an ORG-scoped token (a re-entry racing a mid-flight switch),
    // and copying it over the stash would corrupt the personal session for good.
    const [stashedAccess, stashedRefresh] = await Promise.all([
      read(P_ACCESS_KEY),
      read(P_REFRESH_KEY),
    ]);
    if (stashedAccess && stashedRefresh) return;
    const [accessToken, refreshToken] = await Promise.all([
      read(ACCESS_KEY),
      read(REFRESH_KEY),
    ]);
    if (!accessToken || !refreshToken) return;
    await Promise.all([
      write(P_ACCESS_KEY, accessToken),
      write(P_REFRESH_KEY, refreshToken),
    ]);
  },
  // ── active workspace ───────────────────────────────────────────────────────
  /** Remember WHICH organization the user was working in. Only the id is kept —
   *  the org-scoped token is deliberately NOT persisted across launches, so a
   *  cold start always re-enters through `me.enterWorkspace` and picks up any
   *  access change (revoked membership, archived org) instead of trusting a
   *  stale token. */
  async setActiveOrg(organizationId: string): Promise<void> {
    await write(ACTIVE_ORG_KEY, organizationId);
  },
  async getActiveOrg(): Promise<string | null> {
    return read(ACTIVE_ORG_KEY);
  },
  async clearActiveOrg(): Promise<void> {
    await remove(ACTIVE_ORG_KEY);
  },

  async hasPersonalStash(): Promise<boolean> {
    const [a, r] = await Promise.all([read(P_ACCESS_KEY), read(P_REFRESH_KEY)]);
    return !!a && !!r;
  },
  /** Move the stashed personal tokens back to the active slot (exit workspace). */
  async restorePersonal(): Promise<void> {
    const [accessToken, refreshToken] = await Promise.all([
      read(P_ACCESS_KEY),
      read(P_REFRESH_KEY),
    ]);
    if (accessToken && refreshToken) {
      await Promise.all([
        write(ACCESS_KEY, accessToken),
        write(REFRESH_KEY, refreshToken),
      ]);
    }
    await Promise.all([remove(P_ACCESS_KEY), remove(P_REFRESH_KEY)]);
  },
};

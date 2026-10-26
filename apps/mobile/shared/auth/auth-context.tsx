/**
 * Session/auth context. Holds the authenticated participant (or guest), boots
 * the session from secure-store on launch, and exposes login / register /
 * verify-email / logout. The transport handles token refresh; when a refresh
 * ultimately fails it calls `emitSessionExpired()` and we reset to guest + route
 * to Welcome (MOBILE_API.md §1).
 *
 * Discover/EventDetail are browsable as a guest; Tickets/Certificates/Profile
 * and registering require a session (`useRequireAuth`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { router } from "expo-router";

import { SendVerificationCodeDtoType } from "@eventflow/api-contracts";

import {
  apiTransport,
  accountSdk,
  onSessionExpired,
  publicSdk,
  queryClient,
  rotateQueryScope,
  tokenStore,
} from "@shared/api";
// Deep import намеренно: индекс @shared/notifications тянет bridge, а bridge —
// этот модуль (useAuth); заглушкам токена цикл ни к чему.
import {
  syncDeviceRegistration,
  unregisterDeviceToken,
} from "@shared/notifications/device-token";

import { signInWithOAuth, type OAuthProvider } from "./oauth";

type AccountProfile = Awaited<ReturnType<typeof accountSdk.account.getMe>>;
type LoginInput = Parameters<typeof publicSdk.auth.login>[0];
type RegisterInput = Parameters<typeof publicSdk.auth.registerUser>[0];
type RegisterOrgInput = Parameters<
  typeof publicSdk.auth.registerOrganization
>[0];

type AuthStatus = "loading" | "authenticated" | "guest";

/** `UserType` as reported by `/session/me`. */
export type SessionActorType =
  | "USER"
  | "ORGANIZATION"
  | "MEMBER"
  | "SUPER_ADMIN";

/** An organization the signed-in account belongs to (GET /me/organizations). */
export interface OrgSummary {
  membershipId: string;
  organizationId: string;
  organizationMemberId: string | null;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
  inn: string | null;
  verificationStatus: string;
  kind: string;
  isOwner: boolean;
  roleName: string | null;
  permissions: string[];
}

interface AuthContextValue {
  status: AuthStatus;
  user: AccountProfile | null;
  isAuthenticated: boolean;
  /** The org workspace currently active (null = personal participant mode). */
  workspace: OrgSummary | null;
  /** True while the boot effect is still trying to re-enter the stored
   *  workspace. Org screens must HOLD during this window instead of
   *  redirecting: `workspace` is legitimately null here, and treating that as
   *  "not an organizer" bounces a cold start into the participant feed. */
  workspaceRestoring: boolean;
  /** Actor behind the CURRENT session (`/session/me`). ORGANIZATION = the org
   *  itself is the subject (an owner), MEMBER = a staff person, USER = a
   *  participant. Screens use it to tell "has no personal cabinet" apart from
   *  "could have one" — an owner never can, a staff member can. */
  actorType: SessionActorType | null;
  /** Give a STAFF account its participant profile and switch to it. Rejected
   *  server-side for an organization owner. */
  createParticipantProfile: () => Promise<void>;
  /** List the organizations the account belongs to (for the switcher). */
  listOrganizations: () => Promise<OrgSummary[]>;
  /** Enter an org workspace: stash the personal session, swap to the org token. */
  enterWorkspace: (org: OrgSummary) => Promise<void>;
  /** Leave the workspace and restore the personal session. */
  exitWorkspace: () => Promise<void>;
  /** Re-read the active workspace's summary (name / logo / verification) after
   *  the org profile was edited — the header pill and the switcher rows are
   *  built from it and would otherwise show the old identity until relaunch. */
  refreshWorkspace: () => Promise<void>;
  login: (input: LoginInput) => Promise<{ isParticipant: boolean }>;
  /** Google / LinkedIn sign-in (parity with web). `ok:false` = user cancelled. */
  signInWithProvider: (
    provider: OAuthProvider,
  ) => Promise<{ ok: boolean; isParticipant: boolean }>;
  register: (
    input: RegisterInput,
  ) => Promise<{ emailVerificationRequired: boolean }>;
  /** Register a separate organization owner account without participant scope. */
  registerOrg: (
    input: RegisterOrgInput,
  ) => Promise<{ emailVerificationRequired: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  /** Email a 6-digit PASSWORD_RESET code (forgot-password step 1). */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Set a new password with the emailed reset code (forgot-password step 2). */
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

function persistTokens(tokens: {
  accessToken?: string;
  refreshToken?: string;
}): Promise<void> {
  if (!tokens.accessToken || !tokens.refreshToken) {
    return Promise.resolve();
  }
  return tokenStore.setTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

export function AuthProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AccountProfile | null>(null);
  const [workspace, setWorkspace] = useState<OrgSummary | null>(null);
  const [actorType, setActorType] = useState<SessionActorType | null>(null);
  const [workspaceRestoring, setWorkspaceRestoring] = useState(true);
  const mounted = useRef(true);

  // Returns true when a participant profile loaded, false for an org-only
  // account (no /account/me — identity via /session/me). Callers use this to
  // route org-only accounts to their workspace instead of the participant tabs.
  const loadUser = useCallback(async (): Promise<boolean> => {
    // Participant accounts have an /account/me profile. Organization-owner
    // accounts do NOT (it 403s) — their identity comes from /session/me. So try
    // the participant profile first, and fall back to the session identity so an
    // org owner still authenticates (they can switch into their workspace). Only
    // if BOTH fail do we treat the session as dead (caller resets to guest).
    try {
      const me = await accountSdk.account.getMe();
      if (mounted.current) {
        setUser(me);
        setActorType("USER");
        setStatus("authenticated");
      }
      return true;
    } catch {
      // throws → genuinely unauthenticated. Otherwise it names the actor, which
      // is the only way to tell an owner (no personal cabinet, ever) from a
      // staff member (may create one).
      const session = (await accountSdk.session.getMe()) as {
        actorType?: SessionActorType;
      };
      if (mounted.current) {
        setUser(null);
        setActorType(session?.actorType ?? null);
        setStatus("authenticated");
      }
      return false;
    }
  }, []);

  // Boot the session from secure-store.
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      // If the app was force-quit while in a workspace, the active slot holds an
      // org token — always restore the personal session on boot (no stranding).
      if (await tokenStore.hasPersonalStash()) {
        await tokenStore.restorePersonal();
      }
      const tokens = await tokenStore.getTokens();
      if (!tokens) {
        rotateQueryScope("anonymous");
        if (mounted.current) {
          setStatus("guest");
          setWorkspaceRestoring(false);
        }
        return;
      }
      try {
        await loadUser();
        rotateQueryScope("personal");
      } catch {
        await tokenStore.clear();
        rotateQueryScope("anonymous");
        if (mounted.current) {
          setUser(null);
          setStatus("guest");
          setWorkspaceRestoring(false);
        }
        return;
      }

      // Re-enter the workspace the user was last working in. Without this the
      // app boots every organizer into PARTICIPANT mode, and each org screen's
      // `if (!workspace) <Redirect href="/discover">` then throws them out to
      // the consumer feed — on every cold start and every Fast Refresh.
      // Re-entry goes through the API, so revoked access or an archived org
      // simply fails here and we stay personal rather than stranding the user.
      const lastOrgId = await tokenStore.getActiveOrg();
      if (!lastOrgId) {
        if (mounted.current) setWorkspaceRestoring(false);
        return;
      }
      try {
        const orgs = await accountSdk.me.organizations();
        const org = ((orgs ?? []) as unknown as OrgSummary[]).find(
          (o) => o.organizationId === lastOrgId,
        );
        if (!org) {
          await tokenStore.clearActiveOrg();
          if (mounted.current) setWorkspaceRestoring(false);
          return;
        }
        await tokenStore.stashPersonal();
        const wsTokens = await accountSdk.me.enterWorkspace(org.organizationId);
        await persistTokens(
          wsTokens as { accessToken?: string; refreshToken?: string },
        );
        rotateQueryScope(`organization:${org.organizationId}`);
        if (mounted.current) setWorkspace(org);
      } catch {
        // Re-entry failed — drop the pointer and roll the personal token back
        // into the active slot so the session is still usable as a participant.
        await tokenStore.clearActiveOrg();
        await tokenStore.restorePersonal();
      } finally {
        if (mounted.current) setWorkspaceRestoring(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [loadUser]);

  // Transport → context bridge: a dead session resets us to guest + Welcome.
  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      setWorkspace(null);
      setStatus("guest");
      // Belt-and-braces: a dead session must not leave a workspace pointer that
      // the next boot would try to re-enter.
      void tokenStore.clearActiveOrg();
      rotateQueryScope("anonymous");
      router.replace("/welcome");
    });
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const tokens = await publicSdk.auth.login(input);
      await persistTokens(tokens);
      rotateQueryScope("personal");
      const isParticipant = await loadUser();
      // Upsert идемпотентен — повторный PUT после логина безвреден и освежает
      // lastSeenAt записи устройства (BL-15: пока no-op, тело придёт в BL-25).
      void syncDeviceRegistration("login");
      // Drop any guest-cached data so authed views (myRegistration, saved, etc.)
      // refetch with the token — e.g. an event already registered shows "View ticket".
      void queryClient.invalidateQueries();
      return { isParticipant };
    },
    [loadUser],
  );

  const signInWithProvider = useCallback(
    async (provider: OAuthProvider) => {
      const tokens = await signInWithOAuth(provider);
      if (!tokens) return { ok: false, isParticipant: false };
      await persistTokens(tokens);
      rotateQueryScope("personal");
      const isParticipant = await loadUser();
      void queryClient.invalidateQueries();
      return { ok: true, isParticipant };
    },
    [loadUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await publicSdk.auth.registerUser(input);
      await persistTokens(result);
      rotateQueryScope("personal");
      // Session is live immediately; email verification is a soft gate.
      try {
        await loadUser();
      } catch {
        /* profile load is best-effort right after register */
      }
      const emailVerificationRequired =
        (result as { emailVerificationRequired?: boolean })
          .emailVerificationRequired ?? true;
      return { emailVerificationRequired };
    },
    [loadUser],
  );

  const registerOrg = useCallback(async (input: RegisterOrgInput) => {
    const result = await publicSdk.auth.registerOrganization(input);
    return {
      emailVerificationRequired:
        (result as { emailVerificationRequired?: boolean })
          .emailVerificationRequired ?? true,
    };
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    await publicSdk.verification.verifyEmail({ email, code });
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await publicSdk.verification.resendCode({
      email,
      type: SendVerificationCodeDtoType.EMAIL_VERIFICATION,
    });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await publicSdk.verification.sendCode({
      email,
      type: SendVerificationCodeDtoType.PASSWORD_RESET,
    });
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await publicSdk.verification.resetPassword({ email, code, newPassword });
    },
    [],
  );

  const listOrganizations = useCallback(async () => {
    const orgs = await accountSdk.me.organizations();
    return (orgs ?? []) as unknown as OrgSummary[];
  }, []);

  // Enter an org workspace: stash the personal token, swap the active token to
  // the org-scoped one (so every SDK call is org-scoped), and reset caches.
  const enterWorkspace = useCallback(async (org: OrgSummary) => {
    await tokenStore.stashPersonal();
    const tokens = await accountSdk.me.enterWorkspace(org.organizationId);
    await persistTokens(
      tokens as { accessToken?: string; refreshToken?: string },
    );
    // Remember the choice so the next launch lands back here (see the boot
    // effect above) instead of dropping the organizer into /discover.
    await tokenStore.setActiveOrg(org.organizationId);
    rotateQueryScope(`organization:${org.organizationId}`);
    if (mounted.current) setWorkspace(org);
    // Токен устройства привязан к личному Account, но PUT работает и под
    // org-scoped JWT — освежаем запись при входе в workspace (BL-15/BL-25).
    void syncDeviceRegistration("enter-workspace");
  }, []);

  /**
   * Staff → participant. The server builds a `User` from the staff record and
   * hangs it on the SAME account, then answers with a personal session; we swap
   * to it so the app lands in the cabinet that was just created.
   *
   * Deliberately no client-side gate on who may call this: the rule (owners
   * cannot, staff can) is the server's, and duplicating it here would be a
   * second place to get it wrong. The UI merely hides the entry point.
   */
  const createParticipantProfile = useCallback(async () => {
    const tokens = await apiTransport<{
      accessToken?: string;
      refreshToken?: string;
    }>({
      method: "POST",
      url: "/api/v1/me/participant-profile",
    });
    // The workspace pointer must go: this session is personal now, and leaving
    // it would send the next boot straight back into the organization.
    await tokenStore.clearActiveOrg();
    await persistTokens(tokens ?? {});
    rotateQueryScope("personal");
    if (mounted.current) setWorkspace(null);
    await loadUser();
  }, [loadUser]);

  // Editing the org profile changes the name and logo the header pill and the
  // mode switcher render — both come from `/me/organizations`, which was read
  // once at entry. Re-read it rather than patching the summary locally, so the
  // pill can never disagree with what the server actually stored.
  const refreshWorkspace = useCallback(async () => {
    const active = workspace?.organizationId;
    if (!active) return;
    try {
      const orgs =
        (await accountSdk.me.organizations()) as unknown as OrgSummary[];
      const next = (orgs ?? []).find((o) => o.organizationId === active);
      if (next && mounted.current) setWorkspace(next);
    } catch {
      /* the pill keeps its last known identity — not worth an error surface */
    }
  }, [workspace?.organizationId]);

  const exitWorkspace = useCallback(async () => {
    await tokenStore.restorePersonal();
    await tokenStore.clearActiveOrg();
    rotateQueryScope("personal");
    if (mounted.current) setWorkspace(null);
  }, []);

  const logout = useCallback(async () => {
    // ДО чистки сессии: DELETE /me/devices требует живого токена. Сетевая
    // ошибка logout не блокирует — сервер догасит токен по receipts (BL-25;
    // пока заглушка BL-15).
    try {
      await unregisterDeviceToken();
    } catch {
      /* never block logout on push bookkeeping */
    }
    const refreshToken = await tokenStore.getRefresh();
    try {
      if (refreshToken) await publicSdk.auth.logout({ refreshToken });
    } catch {
      /* best-effort server-side revoke */
    }
    await tokenStore.clear();
    setUser(null);
    setWorkspace(null);
    setStatus("guest");
    rotateQueryScope("anonymous"); // guest must never see authenticated cache
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      await loadUser();
    } catch {
      /* keep current state */
    }
  }, [loadUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      workspace,
      workspaceRestoring,
      actorType,
      createParticipantProfile,
      listOrganizations,
      enterWorkspace,
      exitWorkspace,
      refreshWorkspace,
      login,
      signInWithProvider,
      register,
      registerOrg,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      logout,
      refreshUser,
    }),
    [
      status,
      user,
      workspace,
      workspaceRestoring,
      actorType,
      createParticipantProfile,
      listOrganizations,
      enterWorkspace,
      exitWorkspace,
      refreshWorkspace,
      login,
      signInWithProvider,
      register,
      registerOrg,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      logout,
      refreshUser,
    ],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

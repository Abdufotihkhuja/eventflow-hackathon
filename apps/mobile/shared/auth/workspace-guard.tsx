/**
 * The single gate every organizer screen sits behind.
 *
 * Each of them used to inline `if (!workspace) return <Redirect href="/discover" />`.
 * That is wrong for one window: on a COLD START the workspace is restored
 * asynchronously (see the boot effect in `auth-context`), so `workspace` is
 * legitimately null for a few hundred milliseconds while the token is being
 * traded. Redirecting on that null threw the organizer into the participant
 * feed on every launch and on every deep link into an org route — which is
 * exactly what "почему меня кидает к простому пользователю" looked like.
 *
 * So: HOLD while the restore is in flight, redirect only once it has settled
 * without a workspace. Holding renders a bare canvas rather than a spinner —
 * the wait is short, and a flashing spinner on every launch is worse than a
 * beat of nothing.
 */
import { Redirect } from "expo-router";
import { View } from "react-native";

import { useAuth } from "./auth-context";

/**
 * Returns `null` when the caller may render, or the element it must return
 * instead. Usage, at the top of an org screen, AFTER its hooks:
 *
 *     const gate = useWorkspaceGate();
 *     if (gate) return gate;
 */
export function useWorkspaceGate(): React.JSX.Element | null {
  const { workspace, workspaceRestoring, status } = useAuth();
  if (workspace) return null;
  if (workspaceRestoring || status === "loading") return <View style={{ flex: 1 }} />;
  return <Redirect href="/discover" />;
}

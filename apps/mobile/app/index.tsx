import { useEffect, useState } from "react";
import { Redirect } from "expo-router";

import { useAuth } from "@shared/auth";
import { BrandSplash, SPLASH_MS } from "@shared/ui";

/**
 * Entry point. Route by session: whoever was last working INSIDE an
 * organization lands back in it; a booted participant lands on Discover; an
 * org-only account (no participant profile — Tickets/Certs would 403) lands on
 * the workspace picker instead; a guest starts at Welcome.
 *
 * The workspace is restored asynchronously (boot effect in `auth-context`), so
 * this waits for that restore to settle before routing — the same reason
 * `useWorkspaceGate` holds. Routing on the intermediate null is what made every
 * launch land on the workspace picker (or in the participant feed) even though
 * the workspace was re-entered a moment later.
 *
 * The splash holds for `SPLASH_MS` even when the session resolves sooner.
 * Reading a token out of secure-store takes a couple of hundred milliseconds,
 * and a brand screen that appears and vanishes inside that window reads as a
 * flicker — worse than no splash at all. The bar is timed to finish exactly
 * when the hold does, so what it shows stays true.
 */
export default function Index(): React.JSX.Element {
  const { status, user, workspace, workspaceRestoring } = useAuth();
  const [heldLongEnough, setHeld] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setHeld(true), SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  if (status === "loading" || workspaceRestoring || !heldLongEnough) return <BrandSplash />;
  if (status !== "authenticated") return <Redirect href="/welcome" />;
  if (workspace) return <Redirect href="/org" />;
  return <Redirect href={user ? "/discover" : "/workspace-switch"} />;
}

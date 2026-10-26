/**
 * Nav guard — drops duplicate imperative navigations from rapid taps.
 *
 * A fast double/triple tap on any Pressable fires onPress once per tap, and
 * each `router.push` lands before the first transition settles — the user ends
 * up 2–3 screens deep into the SAME route. expo-router's `useRouter()` returns
 * the module-level `router` singleton, so wrapping `push`/`navigate` here once
 * (at app start, see app/_layout.tsx) covers every call site.
 *
 * Only a repeat of the SAME href inside the window is dropped — distinct
 * destinations in quick succession stay untouched.
 */
import { router } from "expo-router";

export const NAV_DEDUPE_WINDOW_MS = 800;

/** Pure dedupe core (exported for tests): returns true when the nav may proceed. */
export function createNavDedupe(windowMs: number = NAV_DEDUPE_WINDOW_MS): (key: string, now: number) => boolean {
  let lastKey = "";
  let lastAt = -Infinity;
  return (key, now) => {
    if (key === lastKey && now - lastAt < windowMs) return false;
    lastKey = key;
    lastAt = now;
    return true;
  };
}

function hrefKey(href: unknown): string {
  return typeof href === "string" ? href : JSON.stringify(href);
}

let installed = false;

export function installNavGuard(): void {
  if (installed) return;
  installed = true;
  const allow = createNavDedupe();
  for (const method of ["push", "navigate"] as const) {
    const original = router[method].bind(router);
    router[method] = ((href: never, options?: never) => {
      if (!allow(hrefKey(href), Date.now())) return;
      original(href, options);
    }) as (typeof router)[typeof method];
  }
}

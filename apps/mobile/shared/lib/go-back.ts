/**
 * A back action that always leads somewhere.
 *
 * `router.back()` is a no-op when there is nothing to pop — expo-router logs
 * "The action 'GO_BACK' was not handled by any navigator" and the screen just
 * sits there. That is not a dev-only edge case: any deep link (a ticket link in
 * an email, a push into an event, a shared organizer page) opens its screen as
 * the *first* route in the stack, so its back button is dead on arrival.
 *
 * `goBack(router, fallback)` pops when it can, and otherwise replaces the stack
 * with a sensible home — the relevant tab, or Discover.
 */
import type { Router } from "expo-router";

/** Tab roots a stack can safely be replaced with. The organizer shell's roots
 *  belong here too: a deep link into an org screen must fall back to the org
 *  tabs, not drop an organizer into the participant feed. */
export type BackFallback =
  | "/discover"
  | "/tickets"
  | "/certificates"
  | "/profile"
  | "/org"
  | "/org/profile"
  // The auth stack's own root. Every (auth) screen is reachable as a FIRST
  // route — a verification link, a password-reset link, or simply a cold start
  // that lands on Login — so their back buttons need somewhere to go too.
  | "/welcome";

export function goBack(router: Router, fallback: BackFallback = "/discover"): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

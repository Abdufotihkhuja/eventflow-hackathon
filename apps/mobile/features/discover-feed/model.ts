/**
 * Discover feed outcome — which of the upcoming-feed states the screen renders.
 *
 * The reason this is a function and not a chain of ternaries inside the screen:
 * a city-scoped feed that comes back empty used to dead-end on "No upcoming
 * events right now", with no hint that the CITY filter was doing it (events
 * whose `city` is unset are invisible under any city). The feed now probes the
 * same query without the city filter and, if something exists elsewhere, offers
 * it instead of the silent empty state.
 *
 * Both helpers are pure so the branching can be tested without a renderer.
 */

export interface FeedInput {
  /** Region not hydrated yet, or the city-scoped query is still loading. */
  pending: boolean;
  isError: boolean;
  /** Events returned for the selected city. */
  count: number;
  /** A category chip or a filter facet is active. */
  refined: boolean;
  /** A concrete city is selected (i.e. not "all regions"). */
  cityScoped: boolean;
  /** The all-regions probe: requested but not resolved yet? */
  fallbackPending: boolean;
  /** Events the all-regions probe returned. */
  fallbackCount: number;
}

export type FeedOutcome =
  /** Skeletons: the city feed is loading. */
  | "pending"
  /** The city feed failed — retry block. */
  | "error"
  /** Normal feed. */
  | "list"
  /** Nothing matches the active chips/filters — offer to clear them. */
  | "refinedEmpty"
  /** Skeletons: nothing in this city, checking the other regions. */
  | "probing"
  /** Nothing in this city, but other regions have events — show them. */
  | "fallback"
  /** Nothing anywhere — the honest empty state. */
  | "empty";

/**
 * Should the screen issue the extra un-filtered request?
 *
 * Only after the city-scoped query has actually come back empty — never in
 * parallel with it, so a normal cold start still makes ONE request per feed.
 * Refinements are excluded on purpose: with a chip or a facet on, "clear the
 * filters" is the honest advice, not "look at another region".
 */
export function shouldProbeAllRegions(
  i: Pick<FeedInput, "pending" | "isError" | "count" | "refined" | "cityScoped">,
): boolean {
  return !i.pending && !i.isError && i.count === 0 && !i.refined && i.cityScoped;
}

export function resolveFeedOutcome(i: FeedInput): FeedOutcome {
  if (i.pending) return "pending";
  if (i.isError) return "error";
  if (i.count > 0) return "list";
  if (i.refined) return "refinedEmpty";
  // "All regions" already means no city filter — there is nothing to fall back
  // to, so the empty state is the truth.
  if (!i.cityScoped) return "empty";
  if (i.fallbackPending) return "probing";
  return i.fallbackCount > 0 ? "fallback" : "empty";
}

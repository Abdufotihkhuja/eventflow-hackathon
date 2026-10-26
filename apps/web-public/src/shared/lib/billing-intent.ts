/**
 * Plan-context handoff from marketing to the organizer cabinet (P-7).
 *
 * /pricing CTAs link `/signup?plan=PRO|EXCLUSIVE`. The signup flow carries the
 * param through the organizer wizard (and the verify-email step) and, on the
 * final redirect into the cabinet, lands on
 * `/settings/billing?tab=plans&intent=PLAN_<key>` — where web-workspace
 * auto-opens the C-5 request dialog preselected with that plan. The cabinet's
 * login flow preserves the deep link (ProtectedRoute → login `state.from`), so
 * the intent survives the cross-origin auth wall.
 */

/** Paid tiers a signup CTA can preselect. START needs no intent — it is the default. */
export type SignupPlanKey = "PRO" | "EXCLUSIVE";

/** Normalizes a raw `?plan=` search param (string | string[] | undefined). */
export function normalizeSignupPlan(
  value: string | string[] | null | undefined,
): SignupPlanKey | null {
  const single = Array.isArray(value) ? value[0] : value;
  return single === "PRO" || single === "EXCLUSIVE" ? single : null;
}

/**
 * Cabinet path that opens the billing Plans tab with the request dialog
 * preselected. Contract with web-workspace: `intent=PLAN_<key>` on
 * /settings/billing (see features/billing/lib/billing-intent.ts there).
 */
export function workspaceBillingIntentPath(plan: SignupPlanKey): string {
  return `/settings/billing?tab=plans&intent=PLAN_${plan}`;
}

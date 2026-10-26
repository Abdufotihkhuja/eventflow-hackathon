/**
 * Release gate for the new §1 pricing surface (M-14).
 *
 * The /pricing page ships dark: unlinked, `noindex`, excluded from the
 * sitemap. Flipping `NEXT_PUBLIC_PRICING_LIVE=1` at build time makes it
 * indexable, adds it to the sitemap, and surfaces the footer link. The
 * second half of the M-14 atomic flip — swapping the /organizers pricing
 * section to the shared @widgets/pricing source — is a separate code change
 * executed together with the backend go-live
 * (see docs/monetization/13-copy-flip-checklist.md).
 *
 * NOTE: must stay a static `process.env.NEXT_PUBLIC_*` member expression so
 * Next.js inlines it into client bundles too.
 */
export function isPricingLive(): boolean {
  return process.env.NEXT_PUBLIC_PRICING_LIVE === "1";
}

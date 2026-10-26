import { formatNumber, type Locale } from "@eventflow/i18n";

/**
 * Currency display rules for monetization surfaces (P-6, decision A-3/§2.2).
 *
 * Until Stripe exists, USD is a **display anchor only** — never a charged
 * price. Actual billing happens in Uzbek soums, and the UZS price list is set
 * by the owner in S-16 (external gate №4), so `priceAmountMinor` is `null`
 * in the catalog today. The rules encoded here:
 *
 * 1. Show the USD anchor as the primary figure while UZS is unset.
 * 2. `formatUzs` is null-safe: `null` in → `null` out, and the caller renders
 *    the i18n "UZS price to be announced" line (`pricing.currency.uzsPending`)
 *    plus the page-level honest note (`pricing.currency.paymentNote`).
 * 3. Once the owner sets UZS prices (snapshot/P-3b starts returning strings),
 *    UZS becomes the primary price and the USD anchor drops to secondary —
 *    no code change needed beyond the caller preferring a non-null UZS.
 */

/**
 * Formats a marketing USD anchor given in cents: 59900 → "$599".
 * Whole-dollar anchors render without decimals; anything else keeps 2 digits.
 * Null-safe: `null` (no anchor, e.g. the free tier) → `null`.
 */
export function formatAnchorUsd(cents: number | null): string | null {
  if (cents === null || !Number.isFinite(cents)) {
    return null;
  }

  const dollars = cents / 100;
  const hasFraction = cents % 100 !== 0;

  return `$${hasFraction ? dollars.toFixed(2) : String(Math.round(dollars))}`;
}

/**
 * Formats a UZS amount given as a string of minor units (tiyin, D-3
 * string-on-wire): "5990000000" → "59 900 000 soʻm" (locale-grouped).
 *
 * Null-safe: `null` (price not set yet — the launch state) or an unparsable
 * string → `null`; the caller shows the localized "price to be announced"
 * copy instead. Fractional tiyin are dropped — the price list is set in
 * whole soums.
 */
export function formatUzs(
  minorAmount: string | null,
  locale: Locale,
): string | null {
  if (minorAmount === null || !/^\d+$/.test(minorAmount)) {
    return null;
  }

  // Integer division by 100 done on the digit string (no BigInt — the app
  // tsconfig targets pre-ES2020): dropping the last two digits == floor(/100).
  const soumsDigits = minorAmount.length > 2 ? minorAmount.slice(0, -2) : "0";
  const soums = Number(soumsDigits);
  // Money must fit the safe-integer range (max plausible price << 2^53 tiyin).
  if (!Number.isSafeInteger(soums)) {
    return null;
  }

  return `${formatNumber(soums, locale, { maximumFractionDigits: 0 })} ${uzsSuffix(locale)}`;
}

/** Localized currency word for UZS ("soum"). */
function uzsSuffix(locale: Locale): string {
  if (locale === "ru") {
    return "сум";
  }
  if (locale === "uz") {
    return "soʻm";
  }
  return "UZS";
}

/**
 * Resolves the primary display price per rule 1/3 above: prefer a real UZS
 * price when it exists, fall back to the USD anchor while it doesn't.
 * Returns `null` when neither is set (caller decides: free tier or "TBA").
 */
export function formatPrimaryPrice(
  priceAmountMinor: string | null,
  usdAnchorCents: number | null,
  locale: Locale,
): string | null {
  return formatUzs(priceAmountMinor, locale) ?? formatAnchorUsd(usdAnchorCents);
}

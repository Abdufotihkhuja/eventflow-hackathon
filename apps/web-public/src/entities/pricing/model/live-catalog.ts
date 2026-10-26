import {
  PRICING_CATALOG_SNAPSHOT,
  type AddonSkuSnapshot,
  type BillingCatalogSnapshot,
  type PlanSnapshot,
} from "./catalog-snapshot";

/**
 * Live public catalog with a graceful §1-snapshot fallback (P-3b + P-9).
 *
 * `getPricingCatalog()` fetches `GET /api/v1/public/plans` server-side (ISR,
 * 5-minute revalidate) and MERGES it over the static P-3a snapshot:
 *
 * - Merge rule: for every snapshot row (plan by `key`, add-on by `code`), if
 *   the live catalog has a matching row, the live values win — most
 *   importantly `priceAmountMinor`, so owner-set UZS prices (S-16) replace
 *   the USD anchors without a deploy. Rows the live catalog does not return
 *   keep their snapshot values.
 * - Honest empty-state: today the endpoint returns ONLY active rows, and paid
 *   tiers ship dormant until the owner activates prices — so an empty or
 *   START-only payload must NOT blank the marketing page. The snapshot base
 *   guarantees the full §1 lineup always renders.
 * - Live-only rows (a key/code missing from the snapshot) are dropped: this
 *   page advertises the §1 lineup, it is not a checkout — new SKUs get
 *   marketing copy (i18n) before they get a card here.
 * - Fetch/parse failures fall back to the pure snapshot. Per OQ-A4-2
 *   (adopted): price staleness in the fallback is acceptable because binding
 *   prices are re-read at purchase time — the marketing figure is never the
 *   charged amount.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";

/** ISR window for the public catalog — it only changes via S-16 admin edits. */
const CATALOG_REVALIDATE_SECONDS = 300;

/**
 * Minimal structural check that the payload matches `BillingCatalogDto`.
 * The DTO is a 1:1 mirror of the snapshot types, so validating the fields the
 * UI actually renders (identity + price columns) is enough to trust a row.
 */
function isPlanRow(value: unknown): value is PlanSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === "string" &&
    (row.priceAmountMinor === null || typeof row.priceAmountMinor === "string") &&
    (row.usdAnchorCents === null || typeof row.usdAnchorCents === "number") &&
    typeof row.sortOrder === "number"
  );
}

function isAddonRow(value: unknown): value is AddonSkuSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.code === "string" &&
    (row.priceAmountMinor === null || typeof row.priceAmountMinor === "string") &&
    (row.usdAnchorCents === null || typeof row.usdAnchorCents === "number")
  );
}

/** Live rows win for matching keys/codes; the snapshot supplies the rest. */
function mergeWithSnapshot(live: {
  plans: PlanSnapshot[];
  addons: AddonSkuSnapshot[];
}): BillingCatalogSnapshot {
  const livePlans = new Map(live.plans.map((plan) => [plan.key, plan]));
  const liveAddons = new Map(live.addons.map((addon) => [addon.code, addon]));

  return {
    plans: PRICING_CATALOG_SNAPSHOT.plans.map(
      (plan) => livePlans.get(plan.key) ?? plan,
    ),
    addons: PRICING_CATALOG_SNAPSHOT.addons.map(
      (addon) => liveAddons.get(addon.code) ?? addon,
    ),
  };
}

/**
 * Resolves the catalog for the /pricing page: live values where the backend
 * has them, §1 snapshot everywhere else. Never throws — the marketing page
 * must render even with the API down (P-9).
 */
export async function getPricingCatalog(): Promise<BillingCatalogSnapshot> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/public/plans`, {
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return PRICING_CATALOG_SNAPSHOT;
    }

    const payload = (await response.json()) as {
      plans?: unknown;
      addons?: unknown;
    } | null;

    const plans = Array.isArray(payload?.plans)
      ? payload.plans.filter(isPlanRow)
      : [];
    const addons = Array.isArray(payload?.addons)
      ? payload.addons.filter(isAddonRow)
      : [];

    return mergeWithSnapshot({ plans, addons });
  } catch {
    // Network/JSON failure — the static §1 snapshot is the honest fallback.
    return PRICING_CATALOG_SNAPSHOT;
  }
}

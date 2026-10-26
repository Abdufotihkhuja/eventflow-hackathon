/**
 * Static snapshot of the monetization catalog (P-3a).
 *
 * Shape is a 1:1 mirror of the backend `BillingCatalogDto`
 * (apps/api/src/modules/billing/dto/catalog.dto.ts), served by
 * `GET /api/v1/public/plans` (D-11). P-3b (shipped): `getPricingCatalog()`
 * in ./live-catalog.ts fetches that endpoint server-side and merges live rows
 * over this snapshot, which stays as the graceful fallback — consumers depend
 * only on the types below, so the data source remains swappable.
 *
 * Values are seeded from §1 of the business model + docs/monetization/10-decisions.md
 * (same source as the D-15 seed migration `20260704200100_seed_billing_catalog`):
 * - UZS prices are NOT set yet (external gate №4) → `priceAmountMinor: null`
 *   everywhere; USD anchors ($599 / $999 / $35 / $15 / from $50) are
 *   display-only until Stripe exists (§2.2 — until then USD is an anchor, not
 *   a charged price).
 * - `isPurchasable`/`isActive` mirror the seed: paid rows ship dormant until
 *   the owner sets UZS prices in S-16. The marketing /pricing page renders all
 *   tiers regardless of `isActive` (it advertises the lineup; it is not a
 *   checkout), so do NOT filter on these flags for display.
 * - `statsTier` is BASIC for every tier (B-4: forecasting is not sold) and
 *   `qrMode` is ARRIVAL_ONLY for every tier (E-4: extended modes reserved).
 */

/** Mirrors Prisma `PlanKey`. */
export type PlanKey = "START" | "PRO" | "EXCLUSIVE";

/** Mirrors Prisma `GenerationWindow` (A-5): calendar month vs pack period. */
export type GenerationWindow = "CALENDAR_MONTH" | "PACK_PERIOD";

/** Mirrors Prisma `StatsTier`. BASIC everywhere at launch (B-4). */
export type StatsTier = "BASIC" | "FORECASTING" | "FORECASTING_SLA";

/** Mirrors Prisma `QrCheckInMode`. Extended modes are reserved (E-4/OQ-4). */
export type QrCheckInMode = "ARRIVAL_ONLY" | "EXTENDED";

/** Mirrors Prisma `AddonSkuKind`. */
export type AddonSkuKind = "COIN_PACK" | "AD_PRODUCT";

/** Mirrors Prisma `CoinMetric` (CR-26: AI is stored in seconds). */
export type CoinMetric = "AI_SECONDS" | "GENERATION_UNITS";

/** Mirrors Prisma `AdBillingUnit` (decision D-2). */
export type AdBillingUnit = "PER_WEEK" | "PER_CAMPAIGN" | "PER_MESSAGE";

/** Mirrors backend `PlanDto`. Money is string-of-minor-units on the wire (D-3). */
export interface PlanSnapshot {
  key: PlanKey;
  /** UZS price in tiyin as a string; null — the owner has not set it yet. */
  priceAmountMinor: string | null;
  /** Marketing USD anchor in cents; null — no anchor (free tier). */
  usdAnchorCents: number | null;
  isPurchasable: boolean;
  isActive: boolean;
  /** Event credits granted per pack period (0 for START — unlimited-free model). */
  eventCredits: number;
  /** Pack validity in days from activation (§2.1: 90); null — no expiry (START). */
  validityDays: number | null;
  /** Ticket commission in basis points: 1200 / 800 / 600. */
  commissionBps: number;
  /** AI voice-agent minutes per calendar month (E-3: not sellable until the agent is live). */
  aiMinutesMonthly: number;
  /** Certificate/badge generation quota per `generationWindow` (A-5). */
  generationCredits: number;
  generationWindow: GenerationWindow;
  staffSeats: number;
  /** Per-event participant cap; null — uncapped. */
  maxParticipantsPerEvent: number | null;
  taskBoardEnabled: boolean;
  statsTier: StatsTier;
  qrMode: QrCheckInMode;
  sortOrder: number;
}

/** Mirrors backend `AddonSkuDto`. */
export interface AddonSkuSnapshot {
  /** Stable SKU code — also the i18n key: COIN_AI_100MIN, AD_FEATURED_WEEK, … */
  code: string;
  kind: AddonSkuKind;
  /** UZS price (floor for AD_PRODUCT) in tiyin as a string; null — not set. */
  priceAmountMinor: string | null;
  usdAnchorCents: number | null;
  isActive: boolean;
  coinMetric: CoinMetric | null;
  coinQuantity: number | null;
  adBillingUnit: AdBillingUnit | null;
  sortOrder: number;
}

/** Mirrors backend `BillingCatalogDto` — the `GET /api/v1/public/plans` payload. */
export interface BillingCatalogSnapshot {
  plans: PlanSnapshot[];
  addons: AddonSkuSnapshot[];
}

/** Well-known add-on SKU codes (D-15 seed). */
export const ADDON_CODES = {
  coinAi100Min: "COIN_AI_100MIN",
  coinGen100: "COIN_GEN_100",
  adFeaturedWeek: "AD_FEATURED_WEEK",
  adEmailCampaign: "AD_EMAIL_CAMPAIGN",
  adSmsCampaign: "AD_SMS_CAMPAIGN",
} as const;

/**
 * The static catalog (§1): START free / 12%; PRO $599 per 5 events / 90 days /
 * 8%; EXCLUSIVE $999 per 10 events / 90 days / 6%.
 */
export const PRICING_CATALOG_SNAPSHOT: BillingCatalogSnapshot = {
  plans: [
    {
      key: "START",
      priceAmountMinor: null,
      usdAnchorCents: null,
      isPurchasable: false,
      isActive: true,
      eventCredits: 0,
      validityDays: null,
      commissionBps: 1200,
      aiMinutesMonthly: 0,
      generationCredits: 50,
      generationWindow: "CALENDAR_MONTH",
      staffSeats: 1,
      maxParticipantsPerEvent: 50,
      taskBoardEnabled: false,
      statsTier: "BASIC",
      qrMode: "ARRIVAL_ONLY",
      sortOrder: 0,
    },
    {
      key: "PRO",
      priceAmountMinor: null,
      usdAnchorCents: 59900,
      isPurchasable: false,
      isActive: false,
      eventCredits: 5,
      validityDays: 90,
      commissionBps: 800,
      aiMinutesMonthly: 150,
      generationCredits: 200,
      generationWindow: "PACK_PERIOD",
      staffSeats: 3,
      maxParticipantsPerEvent: 400,
      taskBoardEnabled: true,
      statsTier: "BASIC",
      qrMode: "ARRIVAL_ONLY",
      sortOrder: 1,
    },
    {
      key: "EXCLUSIVE",
      priceAmountMinor: null,
      usdAnchorCents: 99900,
      isPurchasable: false,
      isActive: false,
      eventCredits: 10,
      validityDays: 90,
      commissionBps: 600,
      aiMinutesMonthly: 350,
      generationCredits: 500,
      generationWindow: "PACK_PERIOD",
      staffSeats: 10,
      maxParticipantsPerEvent: 600,
      taskBoardEnabled: true,
      statsTier: "BASIC",
      qrMode: "ARRIVAL_ONLY",
      sortOrder: 2,
    },
  ],
  addons: [
    {
      code: ADDON_CODES.coinAi100Min,
      kind: "COIN_PACK",
      priceAmountMinor: null,
      usdAnchorCents: 3500,
      isActive: false,
      coinMetric: "AI_SECONDS",
      // CR-26: AI is metered in seconds — 100 minutes = 6000 seconds.
      coinQuantity: 6000,
      adBillingUnit: null,
      sortOrder: 0,
    },
    {
      code: ADDON_CODES.coinGen100,
      kind: "COIN_PACK",
      priceAmountMinor: null,
      usdAnchorCents: 1500,
      isActive: false,
      coinMetric: "GENERATION_UNITS",
      coinQuantity: 100,
      adBillingUnit: null,
      sortOrder: 1,
    },
    {
      code: ADDON_CODES.adFeaturedWeek,
      kind: "AD_PRODUCT",
      priceAmountMinor: null,
      usdAnchorCents: 5000,
      isActive: false,
      coinMetric: null,
      coinQuantity: null,
      adBillingUnit: "PER_WEEK",
      sortOrder: 10,
    },
    {
      code: ADDON_CODES.adEmailCampaign,
      kind: "AD_PRODUCT",
      priceAmountMinor: null,
      usdAnchorCents: 5000,
      isActive: false,
      coinMetric: null,
      coinQuantity: null,
      adBillingUnit: "PER_CAMPAIGN",
      sortOrder: 11,
    },
    {
      // D-2: SMS campaigns are listed "coming soon" — no provider, no price.
      code: ADDON_CODES.adSmsCampaign,
      kind: "AD_PRODUCT",
      priceAmountMinor: null,
      usdAnchorCents: null,
      isActive: false,
      coinMetric: null,
      coinQuantity: null,
      adBillingUnit: "PER_MESSAGE",
      sortOrder: 12,
    },
  ],
};

/** Convenience lookup: plan by key (throws if the snapshot loses a tier). */
export function getPlanSnapshot(key: PlanKey): PlanSnapshot {
  const plan = PRICING_CATALOG_SNAPSHOT.plans.find((p) => p.key === key);
  if (!plan) {
    throw new Error(`Pricing snapshot is missing plan ${key}`);
  }
  return plan;
}

/** Convenience lookup: add-on by code (null-safe — codes may change server-side). */
export function getAddonSnapshot(code: string): AddonSkuSnapshot | null {
  return PRICING_CATALOG_SNAPSHOT.addons.find((a) => a.code === code) ?? null;
}

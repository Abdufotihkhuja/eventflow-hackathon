import { createTranslator, type Locale, type Translator } from "@eventflow/i18n";

import {
  ADDON_CODES,
  type AddonSkuSnapshot,
  type BillingCatalogSnapshot,
} from "@entities/pricing";
import { formatPrimaryPrice } from "@shared/lib/pricing-format";

import "./pricing.css";

/**
 * Add-on offerings (P-8): coin packs + D-2 advertising SKUs, driven by the
 * passed-in catalog (live-merged-over-snapshot, P-3b). Honest per-offering
 * gating:
 * - COIN_AI_100MIN is "coming soon" (E-3: AI SKUs are not sellable until the
 *   voice agent is live); COIN_GEN_100 has no such gate.
 * - Ads: featured (per week) + email campaigns (per campaign) are the launch
 *   SKUs; SMS is listed "coming soon" (no provider). Ad prices are floors,
 *   hence the "from …" template.
 */

interface AddonItem {
  key: string;
  title: string;
  /** Price + billing-unit line; null — no price to show (coming soon). */
  priceLine: string | null;
  description: string | null;
  comingSoon: boolean;
}

/** Add-on row from the merged catalog (null-safe — codes may change server-side). */
function findAddon(
  catalog: BillingCatalogSnapshot,
  code: string,
): AddonSkuSnapshot | null {
  return catalog.addons.find((addon) => addon.code === code) ?? null;
}

function coinItems(
  catalog: BillingCatalogSnapshot,
  t: Translator,
  locale: Locale,
): AddonItem[] {
  const ai = findAddon(catalog, ADDON_CODES.coinAi100Min);
  const gen = findAddon(catalog, ADDON_CODES.coinGen100);

  return [
    {
      key: ADDON_CODES.coinAi100Min,
      title: t("pricing.coins.aiPack.title"),
      priceLine: ai
        ? formatPrimaryPrice(ai.priceAmountMinor, ai.usdAnchorCents, locale)
        : null,
      description: null,
      // E-3: not sellable until the AI voice agent exists.
      comingSoon: true,
    },
    {
      key: ADDON_CODES.coinGen100,
      title: t("pricing.coins.genPack.title"),
      priceLine: gen
        ? formatPrimaryPrice(gen.priceAmountMinor, gen.usdAnchorCents, locale)
        : null,
      description: null,
      comingSoon: false,
    },
  ];
}

function adItems(
  catalog: BillingCatalogSnapshot,
  t: Translator,
  locale: Locale,
): AddonItem[] {
  const featured = findAddon(catalog, ADDON_CODES.adFeaturedWeek);
  const email = findAddon(catalog, ADDON_CODES.adEmailCampaign);

  const adPriceLine = (
    sku: AddonSkuSnapshot | null,
    unitKey: "pricing.ads.perWeek" | "pricing.ads.perCampaign",
  ): string | null => {
    const price = sku
      ? formatPrimaryPrice(sku.priceAmountMinor, sku.usdAnchorCents, locale)
      : null;
    if (price === null) {
      return null;
    }
    // Ad SKU prices are floors set by the owner (D-2) → "from $50 · per week".
    return `${t("pricing.ads.fromPrice", { price })} · ${t(unitKey)}`;
  };

  return [
    {
      key: ADDON_CODES.adFeaturedWeek,
      title: t("pricing.ads.featured.title"),
      priceLine: adPriceLine(featured, "pricing.ads.perWeek"),
      description: t("pricing.ads.featured.description"),
      comingSoon: false,
    },
    {
      key: ADDON_CODES.adEmailCampaign,
      title: t("pricing.ads.email.title"),
      priceLine: adPriceLine(email, "pricing.ads.perCampaign"),
      description: t("pricing.ads.email.description"),
      comingSoon: false,
    },
    {
      key: ADDON_CODES.adSmsCampaign,
      title: t("pricing.ads.sms.title"),
      // D-2: SMS ships "coming soon" — no provider, no floor price.
      priceLine: null,
      description: t("pricing.ads.sms.description"),
      comingSoon: true,
    },
  ];
}

function AddonCard({
  item,
  soonLabel,
}: {
  item: AddonItem;
  soonLabel: string;
}): React.ReactNode {
  return (
    <article className="pricing-addon">
      <h3 className="pricing-addon__title">
        {item.title}
        {item.comingSoon ? (
          <span className="pricing-addon__soon">{soonLabel}</span>
        ) : null}
      </h3>
      {item.priceLine ? (
        <p className="pricing-addon__price">{item.priceLine}</p>
      ) : null}
      {item.description ? (
        <p className="pricing-addon__desc">{item.description}</p>
      ) : null}
    </article>
  );
}

export function PricingAddons({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: BillingCatalogSnapshot;
}): React.ReactNode {
  const t = createTranslator(locale);

  return (
    <div className="pricing-addons">
      <section aria-labelledby="pricing-coins-heading">
        <h2 id="pricing-coins-heading" className="pricing-addons__heading">
          {t("pricing.coins.heading")}
        </h2>
        <p className="pricing-addons__intro">{t("pricing.coins.intro")}</p>
        {/* Drain order (OQ-5): plan quota first, coins never expire. */}
        <p className="pricing-addons__note">{t("pricing.coins.drainOrder")}</p>
        <div className="pricing-addons__grid">
          {coinItems(catalog, t, locale).map((item) => (
            <AddonCard
              key={item.key}
              item={item}
              soonLabel={t("pricing.coins.comingSoon")}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="pricing-ads-heading">
        <h2 id="pricing-ads-heading" className="pricing-addons__heading">
          {t("pricing.ads.heading")}
        </h2>
        <p className="pricing-addons__intro">{t("pricing.ads.intro")}</p>
        <div className="pricing-addons__grid">
          {adItems(catalog, t, locale).map((item) => (
            <AddonCard
              key={item.key}
              item={item}
              soonLabel={t("pricing.ads.comingSoon")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

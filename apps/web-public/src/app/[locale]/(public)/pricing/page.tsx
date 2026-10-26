import { createTranslator } from "@eventflow/i18n";

import { getPricingCatalog } from "@entities/pricing";
import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import { breadcrumbSchema, pricingProductSchema } from "@shared/lib/json-ld";
import { isPricingLive } from "@shared/lib/pricing-live";
import { buildPageMetadata } from "@shared/lib/seo";
import { Container } from "@shared/ui/container";
import { Eyebrow, ItalicAccent } from "@shared/ui/design-system";
import { JsonLd } from "@shared/ui/json-ld";
import { PricingAddons, PricingPlans } from "@widgets/pricing";

import type { Metadata } from "next";

/**
 * Public §1 pricing page (P-1/P-2). Ships dark behind NEXT_PUBLIC_PRICING_LIVE
 * (M-14): unlinked + noindex by default; the flag flip makes it indexable and
 * linked, and the /organizers pricing section is swapped to the same
 * @widgets/pricing source in the same release step.
 *
 * Data source (P-3b): live `GET /api/v1/public/plans` merged over the §1
 * snapshot, resolved server-side with a graceful fallback — see
 * entities/pricing/model/live-catalog.ts for the merge/fallback contract.
 */

interface PricingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PricingPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);

  const metadata = buildPageMetadata({
    locale,
    path: "/pricing",
    title: t("pricing.meta.title"),
    description: t("pricing.meta.description"),
  });

  if (!isPricingLive()) {
    // Dark launch: crawlable-but-noindex (robots.txt deliberately does not
    // Disallow — see src/app/robots.ts for why noindex must stay readable).
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function PricingPage({
  params,
}: PricingPageProps): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);
  const catalog = await getPricingCatalog();

  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("pricing.meta.title"), path: "/pricing" },
    ],
    locale,
  );

  // P-12: Product/Offer structured data only once the page is live —
  // structured pricing on a noindex dark launch would invite SERP artifacts
  // for a page we are asking engines not to index.
  const pricingProduct = isPricingLive()
    ? pricingProductSchema({
        locale,
        path: "/pricing",
        name: t("pricing.meta.title"),
        description: t("pricing.meta.description"),
        offers: [...catalog.plans]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((plan) => ({
            name: t(`pricing.plans.${plan.key.toLowerCase()}.name`),
            priceAmountMinor: plan.priceAmountMinor,
            usdAnchorCents: plan.usdAnchorCents,
            isPurchasable: plan.isPurchasable,
          })),
      })
    : null;

  return (
    <>
      <JsonLd data={pricingProduct ? [breadcrumb, pricingProduct] : [breadcrumb]} />

      <header className="pricing-hero">
        <Container size="wide">
          <Eyebrow style={{ marginBottom: 8 }}>{t("pricing.hero.eyebrow")}</Eyebrow>
          <h1 className="pricing-hero__heading">
            {t("pricing.hero.title")}{" "}
            <ItalicAccent>{t("pricing.hero.titleAccent")}</ItalicAccent>
          </h1>
          <p className="pricing-hero__intro">{t("pricing.hero.intro")}</p>
        </Container>
      </header>

      <section
        className="pricing-section"
        aria-labelledby="pricing-plans-heading"
      >
        <Container size="wide">
          <h2 id="pricing-plans-heading" className="sr-only">
            {t("pricing.meta.title")}
          </h2>
          <PricingPlans locale={locale} catalog={catalog} />
        </Container>
      </section>

      <div className="pricing-section pricing-section--addons">
        <Container size="wide">
          <PricingAddons locale={locale} catalog={catalog} />
        </Container>
      </div>

      <style>{`
        .pricing-hero {
          background: var(--bg-1);
          color: var(--fg-1);
          padding-block: clamp(36px, 5vw, 56px) clamp(20px, 3vw, 28px);
        }
        .pricing-hero__heading {
          font: 700 clamp(28px, 5vw, 44px) / 1.05 var(--font-sans);
          letter-spacing: -0.025em;
          color: var(--ink-400);
          margin: 0;
          text-wrap: balance;
          max-width: 24ch;
        }
        .pricing-hero__intro {
          margin: 12px 0 0;
          font: 400 16px/1.6 var(--font-sans);
          color: var(--fg-2);
          max-width: 70ch;
          text-wrap: pretty;
        }
        .pricing-section {
          background: var(--bg-1);
          padding-block: clamp(24px, 4vw, 40px) clamp(40px, 6vw, 64px);
        }
        .pricing-section--addons {
          padding-block: 0 clamp(56px, 8vw, 96px);
        }
      `}</style>
    </>
  );
}

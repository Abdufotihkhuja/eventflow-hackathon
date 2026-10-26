import { createTranslator, plural, type Locale, type Translator } from "@eventflow/i18n";

import {
  DAYS_PLURAL,
  EVENTS_PLURAL,
  GENERATIONS_PLURAL,
  MINUTES_PLURAL,
  PARTICIPANTS_PLURAL,
  STAFF_PLURAL,
} from "@shared/lib/plurals";
import { formatPrimaryPrice } from "@shared/lib/pricing-format";
import { DesignIcon } from "@shared/ui/design-system";

import type {
  BillingCatalogSnapshot,
  PlanKey,
  PlanSnapshot,
} from "@entities/pricing";

import { PlanCta } from "./plan-cta";

import "./pricing.css";

/**
 * §1-faithful tier cards (P-1/P-2) rendered from the passed-in catalog —
 * live-merged-over-snapshot from `getPricingCatalog()` (P-3b) — + `pricing`
 * i18n namespace (P-4). Pure — no hooks, no server-only APIs, catalog arrives
 * as a serializable prop — so it renders from the /pricing server page today
 * and drops into the client /organizers landing at the M-14 flip.
 */

interface PlanCardConfig {
  /** i18n sub-scope under `pricing.plans`. */
  i18nKey: "start" | "pro" | "exclusive";
  featured: boolean;
}

const PLAN_CARDS: Record<PlanKey, PlanCardConfig> = {
  START: { i18nKey: "start", featured: false },
  PRO: { i18nKey: "pro", featured: false },
  EXCLUSIVE: { i18nKey: "exclusive", featured: true },
};

interface FactRow {
  label: string;
  value: string;
}

/** Compare rows (P-13: rendered as a `<dl>`), driven by snapshot numbers. */
function factRows(plan: PlanSnapshot, t: Translator, locale: Locale): FactRow[] {
  const rows: FactRow[] = [];

  // Events + validity already render in the price line ("N событий · M дней")
  // for paid packs — list them here only when the price line doesn't (the free
  // START plan), so the header isn't duplicated below.
  const inPriceLine = plan.eventCredits > 0 && plan.validityDays !== null;
  if (!inPriceLine) {
    rows.push({
      label: t("pricing.facts.events"),
      value:
        plan.eventCredits > 0
          ? plural(locale, plan.eventCredits, EVENTS_PLURAL)
          : t("pricing.facts.eventsUnlimited"),
    });
    if (plan.validityDays !== null) {
      rows.push({
        label: t("pricing.facts.validity"),
        value: plural(locale, plan.validityDays, DAYS_PLURAL),
      });
    }
  }

  if (plan.maxParticipantsPerEvent !== null) {
    rows.push({
      label: t("pricing.facts.participants"),
      value: t("pricing.facts.upTo", {
        value: plural(locale, plan.maxParticipantsPerEvent, PARTICIPANTS_PLURAL),
      }),
    });
  }

  rows.push({
    label: t("pricing.facts.seats"),
    value:
      plan.staffSeats === 1
        ? t("pricing.facts.seatSingle")
        : plural(locale, plan.staffSeats, STAFF_PLURAL),
  });

  rows.push({
    label: t("pricing.facts.generations"),
    value: t(
      plan.generationWindow === "CALENDAR_MONTH"
        ? "pricing.facts.perMonth"
        : "pricing.facts.perPack",
      { value: plural(locale, plan.generationCredits, GENERATIONS_PLURAL) },
    ),
  });

  return rows;
}

/**
 * Qualitative bullets per the decision log: E-4 QR copy (START = arrival
 * only), B-4 statistics without forecasting/SLA, B-7 verified certificates,
 * E-3 honest AI "coming soon", support wording only as a contract commitment.
 */
function featureBullets(
  plan: PlanSnapshot,
  t: Translator,
  locale: Locale,
): string[] {
  const bullets: string[] = [
    plan.key === "START"
      ? t("pricing.features.qrStart")
      : t("pricing.features.qrPaid"),
    t("pricing.features.stats"),
    t("pricing.features.verifiedCerts"),
  ];

  if (plan.taskBoardEnabled) {
    bullets.push(t("pricing.features.taskBoard"));
  }

  if (plan.aiMinutesMonthly > 0) {
    bullets.push(
      t("pricing.features.aiCallsSoon", {
        minutes: plural(locale, plan.aiMinutesMonthly, MINUTES_PLURAL),
      }),
    );
  }

  if (plan.key === "EXCLUSIVE") {
    bullets.push(t("pricing.features.prioritySupport"));
  }

  return bullets;
}

function PlanCard({
  plan,
  locale,
}: {
  plan: PlanSnapshot;
  locale: Locale;
}): React.ReactNode {
  const t = createTranslator(locale);
  const config = PLAN_CARDS[plan.key];
  const headingId = `pricing-plan-${config.i18nKey}`;
  const scope = `pricing.plans.${config.i18nKey}` as const;

  // A-3/§2.2 (P-6): UZS is unset at launch → the USD anchor renders as the
  // primary figure; START has neither and shows the localized "Free".
  const price =
    formatPrimaryPrice(plan.priceAmountMinor, plan.usdAnchorCents, locale) ??
    t(`${scope}.priceFree`);

  // OQ-1 hybrid price line: "$599 · 5 событий · 90 дней" with the units
  // visually distinct from the amount.
  const units =
    plan.eventCredits > 0 && plan.validityDays !== null
      ? `${plural(locale, plan.eventCredits, EVENTS_PLURAL)} · ${plural(
          locale,
          plan.validityDays,
          DAYS_PLURAL,
        )}`
      : null;

  const commissionPercent = plan.commissionBps / 100;

  return (
    <article
      className={`pricing-card${config.featured ? " pricing-card--featured" : ""}`}
      aria-labelledby={headingId}
    >
      {config.featured ? (
        <p className="pricing-card__badge">{t("pricing.plans.popularBadge")}</p>
      ) : null}

      <h3 id={headingId} className="pricing-card__name">
        {t(`${scope}.name`)}
      </h3>
      <p className="pricing-card__tagline">{t(`${scope}.tagline`)}</p>

      <p className="pricing-card__price">
        <span className="pricing-card__amount">{price}</span>
        {units ? <span className="pricing-card__units">{units}</span> : null}
      </p>
      <p className="pricing-card__commission">
        <strong>
          {t("pricing.commission.perTicket", { percent: commissionPercent })}
        </strong>
      </p>

      <hr className="pricing-card__divider" aria-hidden="true" />

      <dl className="pricing-card__facts">
        {factRows(plan, t, locale).map((row) => (
          <div key={row.label} className="pricing-card__fact">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <h4 className="pricing-card__included">
        {t("pricing.card.includedHeading")}
      </h4>
      <ul className="pricing-card__features">
        {featureBullets(plan, t, locale).map((bullet) => (
          <li key={bullet} className="pricing-card__feature">
            <span className="pricing-card__feature-icon" aria-hidden="true">
              <DesignIcon name="check" size={14} stroke={2.4} />
            </span>
            {bullet}
          </li>
        ))}
      </ul>

      <PlanCta
        planKey={plan.key}
        className={`pricing-card__cta ${
          config.featured
            ? "pricing-card__cta--featured"
            : "pricing-card__cta--outline"
        }`}
        ariaLabel={t(`${scope}.ctaAria`)}
        label={t(`${scope}.cta`)}
      />
    </article>
  );
}

export function PricingPlans({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: BillingCatalogSnapshot;
}): React.ReactNode {
  const t = createTranslator(locale);
  const plans = [...catalog.plans].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <div className="pricing-plans">
        {plans.map((plan) => (
          <PlanCard key={plan.key} plan={plan} locale={locale} />
        ))}
      </div>

      <div className="pricing-footnotes">
        {/* §2.1 — 90-day validity, renewal re-grants, no rollover. */}
        <p>{t("pricing.footnotes.validity")}</p>
        {/* Honest commission note: ticket sales are not launched yet. */}
        <p>{t("pricing.commission.appliesNote")}</p>
        {/* Decision A-3: UZS is the billing currency; exact prices pending. */}
        <p>{t("pricing.currency.paymentNote")}</p>
      </div>
    </>
  );
}

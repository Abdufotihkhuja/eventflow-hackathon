import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { withLocalePath } from "@shared/lib/i18n-routing";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { getServerTranslator } from "@shared/lib/server-i18n";
import { createLocalizedAlternates } from "@shared/lib/seo";
import { Button } from "@shared/ui/button";
import { MotionFadeIn } from "@shared/ui/motion";

import type { Metadata } from "next";

interface OrganizationInfoPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: OrganizationInfoPageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.metadata.organizationInfoTitle"),
    description: t("public.metadata.organizationInfoDescription"),
    alternates: createLocalizedAlternates(locale, "/organization-info"),
    // Post-signup organisation onboarding screen. Not the B2B landing
    // (that lives at `/organizers` and is also noindex). `follow: true`
    // keeps the CTA links to the organizer app discoverable as edges.
    // Pair with the robots.txt change that stopped Disallow'ing this
    // route — Googlebot can now read this tag for real.
    robots: { index: false, follow: true },
  };
}

const ORGANIZER_APP_URL = "https://app.eventflow.uz";

const FEATURE_KEYS = [
  "public.organizationInfo.featureCreateEvents",
  "public.organizationInfo.featureManageTickets",
  "public.organizationInfo.featureTrackAnalytics",
  "public.organizationInfo.featureScanQr",
] as const;

type TFunction = (
  key: string,
  values?: Record<string, string | number>
) => string;

const SuccessIcon = (): React.JSX.Element => (
  <div className="mb-6 flex justify-center">
    <div className="relative">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-forest-100 to-forest-50">
        <CheckCircle2 className="h-10 w-10 text-forest-500" strokeWidth={1.5} />
      </div>
      <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-forest-100">
        <Building2 className="h-4 w-4 text-forest-500" strokeWidth={2} />
      </div>
    </div>
  </div>
);

const InfoCard = ({ t }: { t: TFunction }): React.JSX.Element => (
  <div className="mb-8 rounded-xl border-2 border-forest-100 bg-forest-50 p-5">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-forest-100">
        <Building2 className="h-6 w-6 text-forest-500" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="font-semibold text-forest-600">
          {t("public.navigation.organizers")}
        </h2>
        <p className="mt-1 text-sm text-forest-600">
          {t("public.organizationInfo.panelDescription")}
        </p>
        <a
          href={ORGANIZER_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-500 transition hover:text-forest-400"
        >
          app.eventflow.uz
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
        </a>
      </div>
    </div>
  </div>
);

// Список возможностей панели организатора
const FeaturesList = ({ t }: { t: TFunction }): React.JSX.Element => (
  <div className="mb-8 space-y-3">
    <p className="text-sm font-medium text-ink-200">
      {t("public.organizationInfo.panelFeaturesTitle")}
    </p>
    <ul className="space-y-2">
      {FEATURE_KEYS.map((key) => (
        <li
          key={key}
          className="flex items-center gap-2 text-sm text-ink-100"
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-forest-400"
            strokeWidth={2}
          />
          {t(key)}
        </li>
      ))}
    </ul>
  </div>
);

export default async function OrganizationInfoPage({
  params,
}: OrganizationInfoPageProps): Promise<React.JSX.Element> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const homePath = withLocalePath("/", locale);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Декоративные элементы фона */}
      <div className=" pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 opacity-40" />
      <div className=" pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 opacity-30" />

      {/* Контейнер */}
      <MotionFadeIn
        direction="none"
        className="border border-[var(--border-1)] bg-white shadow-sm relative w-full max-w-lg rounded-xl p-8 shadow-[0_24px_64px_rgba(15,23,42,0.15)] sm:p-10"
      >
        <div className=" rounded-xl" />

        <div className="relative z-10">
          {/* Логотип */}
          <div className="mb-8 text-center">
            <Link
              href={homePath}
              className="inline-block transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60 focus-visible:ring-offset-2"
            >
              <Image
                src="/assets/logo.svg"
                alt={t("public.shared.logoAlt")}
                width={180}
                height={48}
                priority
                className="mx-auto"
              />
            </Link>
          </div>

          <SuccessIcon />

          {/* Заголовок */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink-400 sm:text-3xl">
              {t("public.organizationInfo.successTitle")}
            </h1>
            <p className="mt-3 text-base text-ink-100">
              {t("public.organizationInfo.successDescription")}
            </p>
          </div>

          <InfoCard t={t} />
          <FeaturesList t={t} />

          {/* CTA Button */}
          <a href={ORGANIZER_APP_URL} target="_blank" rel="noopener noreferrer">
            <Button
              variant="primary"
              size="lg"
              className="w-full bg-forest-500 hover:bg-forest-600 focus:ring-forest-200/60"
              rightIcon={<ArrowRight className="h-5 w-5" strokeWidth={2} />}
            >
              {t("public.organizationInfo.ctaButton")}
            </Button>
          </a>

          <p className="mt-6 text-center text-sm text-ink-100">
            {`${t("public.organizationInfo.backHomePrefix")} `}
            <Link
              href={homePath}
              className="font-semibold text-ember-400 transition hover:text-ember-300 focus:outline-none focus-visible:underline"
            >
              {t("public.organizationInfo.backHomeLink")}
            </Link>
          </p>
        </div>
      </MotionFadeIn>
    </div>
  );
}

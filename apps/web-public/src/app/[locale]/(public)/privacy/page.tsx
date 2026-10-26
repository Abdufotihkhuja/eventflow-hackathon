import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { getServerTranslator } from "@shared/lib/server-i18n";
import { buildPageMetadata } from "@shared/lib/seo";
import { Card } from "@shared/ui/card";
import {
  Eyebrow,
  HairlineDivider,
  Lead,
  Masthead,
  Mono,
  SectionLabel,
} from "@shared/ui/design-system";

import type { Translator } from "@eventflow/i18n";
import type { Metadata } from "next";

interface PrivacyPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return buildPageMetadata({
    locale,
    path: "/privacy",
    title: t("public.legal.privacy.title"),
    description: t("public.legal.privacy.intro"),
  });
}

function getPrivacySections(t: Translator) {
  return [
    {
      title: t("public.legal.privacy.sections.collectedTitle"),
      content: t("public.legal.privacy.sections.collectedContent"),
    },
    {
      title: t("public.legal.privacy.sections.purposeTitle"),
      content: t("public.legal.privacy.sections.purposeContent"),
    },
    {
      title: t("public.legal.privacy.sections.sharingTitle"),
      content: t("public.legal.privacy.sections.sharingContent"),
    },
    {
      title: t("public.legal.privacy.sections.storageTitle"),
      content: t("public.legal.privacy.sections.storageContent"),
    },
  ];
}

export default async function PrivacyPage(): Promise<React.ReactNode> {
  const { t } = await getServerTranslator();
  const privacySections = getPrivacySections(t);

  return (
    <div className="container-narrow py-12 md:py-20">
      <div className="mx-auto max-w-3xl space-y-12">
        <Masthead
          eyebrow={t("public.legal.label")}
          title={t("public.legal.privacy.title")}
          lede={t("public.legal.privacy.intro")}
          meta={[
            {
              key: t("public.legal.label"),
              value: <Mono>v1.0 · 2026</Mono>,
            },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2">
          {privacySections.map((section) => (
            <Card key={section.title} radius="lg" padding="lg" shadow="xs">
              <h2 className="text-lg font-semibold text-ink-400">
                {section.title}
              </h2>
              <p
                className="mt-3 text-sm text-ink-200"
                style={{ lineHeight: "1.65", textWrap: "pretty" }}
              >
                {section.content}
              </p>
            </Card>
          ))}
        </section>

        <span id="cookies" />
        <SectionLabel>{t("public.legal.privacy.cookiesTitle")}</SectionLabel>
        <Card radius="lg" padding="lg" surface="bone" shadow="none">
          <Lead>{t("public.legal.privacy.cookiesContent")}</Lead>
        </Card>

        <HairlineDivider />

        <Card radius="lg" padding="lg" shadow="xs">
          <h2 className="text-xl font-semibold text-ink-400">
            {t("public.legal.privacy.dataTitle")}
          </h2>
          <p
            className="mt-3 text-sm text-ink-200"
            style={{ lineHeight: "1.65", textWrap: "pretty" }}
          >
            {t("public.legal.privacy.dataContent")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/profile/settings"
              className="inline-flex h-11 items-center rounded-md bg-ember-400 px-[18px] text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100"
            >
              {t("public.legal.privacy.openSettings")}
            </Link>
            <Link
              href="/terms"
              className="inline-flex h-11 items-center rounded-md border border-[var(--border-2)] bg-white px-[18px] text-sm font-semibold text-ink-400 transition-colors hover:border-[var(--border-strong)] hover:bg-bone-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100"
            >
              {t("public.legal.privacy.openTerms")}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

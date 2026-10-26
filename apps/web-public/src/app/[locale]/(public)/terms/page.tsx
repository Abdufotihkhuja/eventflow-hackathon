import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { getServerTranslator } from "@shared/lib/server-i18n";
import { buildPageMetadata } from "@shared/lib/seo";
import { Card } from "@shared/ui/card";
import {
  HairlineDivider,
  Lead,
  Masthead,
  Mono,
  SectionLabel,
} from "@shared/ui/design-system";

import type { Translator } from "@eventflow/i18n";
import type { Metadata } from "next";

interface TermsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return buildPageMetadata({
    locale,
    path: "/terms",
    title: t("public.legal.terms.title"),
    description: t("public.legal.terms.intro"),
  });
}

function getTermsSections(t: Translator) {
  return [
    {
      title: t("public.legal.terms.sections.roleTitle"),
      content: t("public.legal.terms.sections.roleContent"),
    },
    {
      title: t("public.legal.terms.sections.accountsTitle"),
      content: t("public.legal.terms.sections.accountsContent"),
    },
    {
      title: t("public.legal.terms.sections.contentTitle"),
      content: t("public.legal.terms.sections.contentContent"),
    },
    {
      title: t("public.legal.terms.sections.restrictionsTitle"),
      content: t("public.legal.terms.sections.restrictionsContent"),
    },
  ];
}

export default async function TermsPage(): Promise<React.ReactNode> {
  const { t } = await getServerTranslator();
  const termsSections = getTermsSections(t);

  return (
    <div className="container-narrow py-12 md:py-20">
      <div className="mx-auto max-w-3xl space-y-12">
        <Masthead
          eyebrow={t("public.legal.label")}
          title={t("public.legal.terms.title")}
          lede={t("public.legal.terms.intro")}
          meta={[
            {
              key: t("public.legal.label"),
              value: <Mono>v1.0 · 2026</Mono>,
            },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2">
          {termsSections.map((section) => (
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

        <SectionLabel>{t("public.legal.terms.ticketsTitle")}</SectionLabel>
        <Card radius="lg" padding="lg" surface="bone" shadow="none">
          <Lead>{t("public.legal.terms.ticketsContent")}</Lead>
        </Card>

        <HairlineDivider />

        <Card radius="lg" padding="lg" shadow="xs">
          <h2 className="text-xl font-semibold text-ink-400">
            {t("public.legal.terms.relatedTitle")}
          </h2>
          <p
            className="mt-3 text-sm text-ink-200"
            style={{ lineHeight: "1.65", textWrap: "pretty" }}
          >
            {t("public.legal.terms.relatedContent")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/privacy"
              className="inline-flex h-11 items-center rounded-md bg-ember-400 px-[18px] text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100"
            >
              {t("public.legal.terms.openPrivacy")}
            </Link>
            <Link
              href="/events"
              className="inline-flex h-11 items-center rounded-md border border-[var(--border-2)] bg-white px-[18px] text-sm font-semibold text-ink-400 transition-colors hover:border-[var(--border-strong)] hover:bg-bone-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100"
            >
              {t("public.legal.terms.backToEvents")}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

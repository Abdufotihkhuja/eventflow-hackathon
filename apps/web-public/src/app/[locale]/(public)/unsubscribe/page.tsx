import { createLocalizedAlternates } from "@shared/lib/seo";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { Card } from "@shared/ui/card";
import { Masthead } from "@shared/ui/design-system";

import { UnsubscribeForm } from "./unsubscribe-form";

import type { Metadata } from "next";


interface UnsubscribePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

export async function generateMetadata({
  params,
}: UnsubscribePageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);
  return {
    title: t("public.unsubscribe.title"),
    description: t("public.unsubscribe.intro"),
    alternates: createLocalizedAlternates(locale, "/unsubscribe"),
    robots: { index: false, follow: false },
  };
}

interface StatusResponse {
  valid: boolean;
  unsubscribed?: boolean;
}

async function fetchStatus(token: string): Promise<StatusResponse> {
  if (!API_BASE) return { valid: false };
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/email/unsubscribe/status?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { valid: false };
    return (await res.json()) as StatusResponse;
  } catch {
    return { valid: false };
  }
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps): Promise<React.ReactNode> {
  const { t } = await getServerTranslator();
  const token = (await searchParams).token?.trim() ?? "";

  const status = token
    ? await fetchStatus(token)
    : ({ valid: false } as StatusResponse);

  return (
    <div className="container-narrow py-12 md:py-20">
      <div className="mx-auto max-w-2xl space-y-10">
        <Masthead
          eyebrow="EVENTFLOW"
          title={t("public.unsubscribe.title")}
          lede={t("public.unsubscribe.intro")}
        />

        <Card radius="lg" padding="lg" shadow="xs">
          {status.valid ? (
            <div className="space-y-5">
              <p
                className="text-sm text-ink-200"
                style={{ lineHeight: "1.65" }}
              >
                {status.unsubscribed
                  ? t("public.unsubscribe.statusUnsubscribed")
                  : t("public.unsubscribe.statusSubscribed")}
              </p>
              <UnsubscribeForm
                apiBase={API_BASE}
                token={token}
                alreadyUnsubscribed={Boolean(status.unsubscribed)}
                labels={{
                  confirmButton: t("public.unsubscribe.confirmButton"),
                  working: t("public.unsubscribe.working"),
                  successTitle: t("public.unsubscribe.successTitle"),
                  successBody: t("public.unsubscribe.successBody"),
                  alreadyBody: t("public.unsubscribe.alreadyBody"),
                  errorBody: t("public.unsubscribe.errorBody"),
                }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-ink-400">
                {t("public.unsubscribe.invalidTitle")}
              </h2>
              <p
                className="text-sm text-ink-200"
                style={{ lineHeight: "1.65" }}
              >
                {t("public.unsubscribe.invalidBody")}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

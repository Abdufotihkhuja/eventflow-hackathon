import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { AlertCircle } from "lucide-react";

import {
  VerifyEmailView,
  VerifyEmailCodeView,
} from "@features/auth/verify-email";
import { normalizeSignupPlan } from "@shared/lib/billing-intent";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { createLocalizedAlternates } from "@shared/lib/seo";
import { AuthShell } from "@widgets/auth-shell";

import type { Metadata } from "next";

interface VerifyEmailPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    token?: string;
    email?: string;
    type?: "user" | "organizer";
    /** Plan preselected by a /pricing CTA (P-7), carried from /signup. */
    plan?: string | string[];
  }>;
}

export async function generateMetadata({
  params,
}: Pick<VerifyEmailPageProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.metadata.verifyEmailTitle"),
    description: t("public.metadata.verifyEmailDescription"),
    alternates: createLocalizedAlternates(locale, "/verify-email"),
    // Private flow — tokenised email verification has no SERP value and
    // can leak verification tokens via referrer. `follow: true` lets any
    // internal navigation links still pass authority. Pair with the
    // robots.txt change: this `noindex` only fires when Googlebot is
    // actually allowed to crawl the page and read the tag.
    robots: { index: false, follow: true },
  };
}

export default async function VerifyEmailPage({
  params: routeParams,
  searchParams,
}: VerifyEmailPageProps): Promise<React.JSX.Element> {
  const { t } = await getServerTranslator((await routeParams).locale);
  const params = await searchParams;
  const token = params.token || null;
  const email = params.email;
  const accountType = params.type || "user";
  const plan = normalizeSignupPlan(params.plan);
  const codeFlowEmail = email ?? "";

  // Backend поддерживает только кодовый flow.
  const shouldUseCodeFlow = Boolean(email);
  const isTokenLinkFlow = Boolean(token) && !email;

  if (shouldUseCodeFlow) {
    // VerifyEmailCodeView сама рендерит свой icon/title/description, поэтому
    // оборачиваем в shell без header.
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="border border-[var(--border-1)] bg-white shadow-sm relative w-full max-w-md rounded-xl p-5 shadow-[0_24px_64px_rgba(15,23,42,0.10)] sm:rounded-xl sm:p-8 md:p-10">
          <VerifyEmailCodeView
            email={codeFlowEmail}
            accountType={accountType}
            plan={plan}
          />
        </div>
      </div>
    );
  }

  if (isTokenLinkFlow) {
    return (
      <AuthShell
        icon={AlertCircle}
        width="sm"
        backLink={{
          href: "/",
          label: t("public.auth.verifyEmailPage.backToHome"),
        }}
        title={t("public.auth.verifyEmailPage.expiredTitle")}
        description={t("public.auth.verifyEmailPage.expiredDescription")}
      >
        <div className="grid gap-3">
          <Link
            href="/signup"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ember-400 px-6 text-sm font-semibold text-bone-50 transition hover:bg-ember-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60 focus-visible:ring-offset-2"
          >
            {t("public.auth.verifyEmailPage.getNewCode")}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-bone-300 px-6 text-sm font-semibold text-ink-200 transition hover:border-ember-100 hover:text-ember-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60 focus-visible:ring-offset-2"
          >
            {t("public.auth.verifyEmailPage.goToLogin")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  // Дефолтный сценарий: показать инструкцию о письме.
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="border border-[var(--border-1)] bg-white shadow-sm relative w-full max-w-md rounded-xl p-5 shadow-[0_24px_64px_rgba(15,23,42,0.10)] sm:rounded-xl sm:p-8 md:p-10">
        <VerifyEmailView email={email} />
      </div>
    </div>
  );
}

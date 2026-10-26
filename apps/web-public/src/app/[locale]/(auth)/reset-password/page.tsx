import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { AlertCircle, ShieldCheck } from "lucide-react";

import { ResetPasswordCodeForm } from "@features/auth/reset-password";
import { organizerLoginUrl } from "@shared/config/urls";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { createLocalizedAlternates } from "@shared/lib/seo";
import { AuthShell } from "@widgets/auth-shell";

import type { Metadata } from "next";

interface ResetPasswordPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    token?: string;
    email?: string;
    source?: string;
  }>;
}

export async function generateMetadata({
  params,
}: Pick<ResetPasswordPageProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.metadata.resetPasswordTitle"),
    description: t("public.metadata.resetPasswordDescription"),
    alternates: createLocalizedAlternates(locale, "/reset-password"),
    // Auth page — noindex (see /login for the full rationale).
    robots: { index: false, follow: true },
  };
}

export default async function ResetPasswordPage({
  params: routeParams,
  searchParams,
}: ResetPasswordPageProps): Promise<React.JSX.Element> {
  const { t } = await getServerTranslator((await routeParams).locale);
  const params = await searchParams;
  const token = params.token || "";
  const email = params.email;
  const source = params.source === "workspace" ? "workspace" : "public";
  const workspaceLoginUrl = new URL(organizerLoginUrl);
  if (email) {
    workspaceLoginUrl.searchParams.set("email", email);
  }
  workspaceLoginUrl.searchParams.set("passwordReset", "true");

  // Новый flow: пришли с email, без устаревшего token.
  if (email && !token) {
    return (
      <AuthShell
        icon={ShieldCheck}
        width="sm"
        backLink={{
          href: `/forgot-password?email=${encodeURIComponent(email)}${
            source === "workspace" ? "&source=workspace" : ""
          }`,
          label: t("public.auth.resetPasswordPage.back"),
        }}
        title={t("public.auth.resetPasswordPage.heading")}
        description={t("public.auth.resetPasswordPage.subtitle")}
      >
        <ResetPasswordCodeForm
          email={email}
          workspaceLoginUrl={
            source === "workspace" ? workspaceLoginUrl.toString() : undefined
          }
        />
      </AuthShell>
    );
  }

  // Старые ссылки с token больше не поддерживаются backend.
  if (token) {
    return (
      <AuthShell
        icon={AlertCircle}
        width="sm"
        title={t("public.auth.resetPasswordPage.expiredTitle")}
        description={t("public.auth.resetPasswordPage.expiredDescription")}
      >
        <Link
          href="/forgot-password"
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ember-400 px-6 text-sm font-semibold text-bone-50 transition hover:bg-ember-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60 focus-visible:ring-offset-2"
        >
          {t("public.auth.resetPasswordPage.requestNewCode")}
        </Link>
      </AuthShell>
    );
  }

  // Прямой переход без email/token — приглашаем запросить ссылку заново.
  return (
    <AuthShell
      icon={AlertCircle}
      width="sm"
      title={t("public.auth.resetPasswordPage.invalidTitle")}
      description={t("public.auth.resetPasswordPage.invalidDescription")}
    >
      <Link
        href="/forgot-password"
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ember-400 px-6 text-sm font-semibold text-bone-50 transition hover:bg-ember-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60 focus-visible:ring-offset-2"
      >
        {t("public.auth.resetPasswordPage.requestNewLink")}
      </Link>
    </AuthShell>
  );
}

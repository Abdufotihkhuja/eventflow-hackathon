"use client";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { usePathname } from "next/navigation";

import { useT } from "@eventflow/i18n/react";
import { stripLocalePrefix } from "@shared/lib/i18n-routing";
import { isPricingLive } from "@shared/lib/pricing-live";
import { cn } from "@shared/lib/utils";

const footerNav = [
  {
    titleKey: "public.footer.navigation",
    links: [
      { labelKey: "public.navigation.home", href: "/" },
      { labelKey: "public.navigation.about", href: "/about" },
      { labelKey: "public.footer.findEvents", href: "/events" },
    ],
  },
  {
    titleKey: "public.footer.platform",
    links: [
      { labelKey: "public.navigation.blog", href: "/blog" },
      { labelKey: "public.footer.aboutPlatform", href: "/about" },
      { labelKey: "public.navigation.faq", href: "/faq" },
      {
        labelKey: "public.navigation.organizersDirectory",
        href: "/organizers/all",
      },
      // M-14 release gate: /pricing stays unlinked until the flag flips.
      ...(isPricingLive()
        ? [{ labelKey: "pricing.nav.label", href: "/pricing" }]
        : []),
    ],
  },
  {
    titleKey: "public.footer.company",
    links: [
      { labelKey: "public.footer.terms", href: "/terms" },
      { labelKey: "public.footer.privacy", href: "/privacy" },
    ],
  },
  {
    titleKey: "public.footer.community",
    links: [
      { labelKey: "Telegram", href: "https://t.me" },
      { labelKey: "Instagram", href: "https://instagram.com" },
      { labelKey: "LinkedIn", href: "https://linkedin.com" },
    ],
  },
];

const focusRingClass =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-400";

export function LandingFooter(): React.ReactNode {
  const t = useT();
  const pathname = stripLocalePrefix(usePathname());
  return (
    <footer
      className="relative z-40 w-full bg-ink-400 text-bone-50"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="container-wide flex flex-col gap-12 py-12 md:py-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="flex max-w-sm flex-col gap-4">
            <Link href="/" className="inline-block w-fit">
              <Image
                src="/assets/logo.svg"
                alt="EVENTFLOW"
                width={140}
                height={38}
                className="h-7 w-auto sm:h-8"
                style={{ width: "auto" }}
              />
            </Link>
            <p
              style={{
                font: "var(--w-regular) var(--text-sm)/1.6 var(--font-sans)",
                color: "rgba(250,250,249,0.7)",
                textWrap: "pretty",
              }}
            >
              {t("public.footer.description")}
            </p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-10 lg:grid-cols-4">
            {footerNav.map(({ titleKey, links }) => (
              <div key={titleKey} className="flex flex-col gap-4">
                <span
                  style={{
                    font: "var(--w-medium) 11px/1.4 var(--font-sans)",
                    letterSpacing: "var(--track-eyebrow)",
                    textTransform: "uppercase",
                    color: "rgba(250,250,249,0.5)",
                  }}
                >
                  {t(titleKey)}
                </span>
                <ul className="flex flex-col gap-2">
                  {links.map((link) => {
                    const isActive =
                      pathname === link.href ||
                      (link.href !== "/" &&
                        !link.href.startsWith("#") &&
                        !link.href.startsWith("http") &&
                        pathname?.startsWith(link.href));

                    return (
                      <li key={link.labelKey}>
                        <Link
                          className={cn(
                            "inline-block rounded-sm px-1 py-1 text-sm transition-colors duration-200",
                            focusRingClass,
                            isActive
                              ? "font-medium text-ember-300"
                              : "text-bone-50 hover:text-ember-300"
                          )}
                          href={link.href}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {link.labelKey.includes(".")
                            ? t(link.labelKey)
                            : link.labelKey}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className="safe-bottom flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid rgba(250,250,249,0.08)" }}
        >
          <span
            style={{
              font: "var(--w-medium) 12px/1 var(--font-mono)",
              letterSpacing: "0.06em",
              color: "rgba(250,250,249,0.55)",
            }}
          >
            © {new Date().getFullYear()} EVENTFLOW · {t("public.footer.rights")}
          </span>
          <div
            className="flex flex-wrap items-center gap-3 text-xs sm:gap-4"
            style={{ color: "rgba(250,250,249,0.55)" }}
          >
            <Link
              href="/privacy"
              className={cn(
                "rounded-sm px-1 py-1 transition-colors duration-200 hover:text-bone-50",
                focusRingClass
              )}
            >
              {t("public.footer.privacyShort")}
            </Link>
            <span style={{ color: "rgba(250,250,249,0.32)" }} aria-hidden>
              ·
            </span>
            <Link
              href="/terms"
              className={cn(
                "rounded-sm px-1 py-1 transition-colors duration-200 hover:text-bone-50",
                focusRingClass
              )}
            >
              {t("public.footer.termsShort")}
            </Link>
            <span style={{ color: "rgba(250,250,249,0.32)" }} aria-hidden>
              ·
            </span>
            <Link
              href="/privacy#cookies"
              className={cn(
                "rounded-sm px-1 py-1 transition-colors duration-200 hover:text-bone-50",
                focusRingClass
              )}
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

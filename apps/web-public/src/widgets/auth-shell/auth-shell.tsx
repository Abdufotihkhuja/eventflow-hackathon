import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { MotionFadeIn } from "@shared/ui/motion";

type AuthShellWidth = "sm" | "md" | "lg";

const WIDTH_CLASS: Record<AuthShellWidth, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

interface AuthShellProps {
  /** Page title (h1). Optional — pages that drive their own heading (e.g. multi-step signup) can omit it. */
  title?: string;
  /** Sub-headline below the title. */
  description?: ReactNode;
  /** Either a Lucide icon (for narrow auth screens like reset/verify) or a logo (signup/login). */
  icon?: LucideIcon;
  /** When passed, renders the EventFlow logo above the title. Click goes to `logoHref`. */
  logo?: {
    src: string;
    alt: string;
    href: string;
  };
  /**
   * Desktop-only back link (≥ lg). Hidden on mobile/tablet — the browser's
   * back button + the clickable logo are sufficient on small screens.
   */
  backLink?: {
    href: string;
    label: string;
  };
  /** Card width. Defaults to `md`. */
  width?: AuthShellWidth;
  /** Form / body content. */
  children: ReactNode;
  /** Optional footer below the form (used for OAuth buttons / dividers). */
  footer?: ReactNode;
}

/**
 * Eventflow Public — auth shell.
 * Editorial bone-paper card on bone canvas. Used by signup, login,
 * forgot/reset password, verify-email, organization-setup, complete-profile.
 */
export function AuthShell({
  title,
  description,
  icon: Icon,
  logo,
  backLink,
  width = "md",
  children,
  footer,
}: AuthShellProps): React.JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bone-100 px-4 py-12 sm:px-6 sm:py-16">
      {backLink && (
        <Link
          href={backLink.href}
          className="group absolute left-6 top-6 hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:text-ink-400 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 lg:inline-flex lg:left-8 lg:top-8"
        >
          <ArrowLeft
            className="h-4 w-4 transition group-hover:-translate-x-0.5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {backLink.label}
        </Link>
      )}

      <MotionFadeIn
        direction="none"
        className={`relative w-full ${WIDTH_CLASS[width]} rounded-xl border border-[var(--border-1)] bg-white p-5 shadow-sm sm:p-10 md:p-12`}
      >
        <div className="relative z-10">
          {(logo || Icon || title) && (
            <header className="mb-6 text-center sm:mb-10">
              {logo && (
                <Link
                  href={logo.href}
                  className="inline-block transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 rounded-sm"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={180}
                    height={48}
                    priority
                    className="mx-auto h-10 w-auto sm:h-11"
                  />
                </Link>
              )}
              {Icon && !logo && (
                <div
                  aria-hidden="true"
                  className="mx-auto flex size-14 items-center justify-center rounded-md bg-ember-50 text-ember-500 sm:size-16"
                >
                  <Icon className="size-6 sm:size-7" strokeWidth={1.75} />
                </div>
              )}
              {title && (
                <h1
                  className="mt-6 text-2xl font-bold text-ink-400 sm:text-3xl"
                  style={{
                    letterSpacing: "var(--track-snug)",
                    textWrap: "balance",
                  }}
                >
                  {title}
                </h1>
              )}
              {description && (
                <p
                  className="mt-3 text-sm text-ink-200 sm:text-base"
                  style={{ lineHeight: "1.6", textWrap: "pretty" }}
                >
                  {description}
                </p>
              )}
            </header>
          )}

          {children}

          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </MotionFadeIn>
    </div>
  );
}

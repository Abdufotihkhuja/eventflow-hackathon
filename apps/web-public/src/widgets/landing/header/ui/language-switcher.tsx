"use client";

import { usePathname, useRouter } from "next/navigation";

import { useLanguageSwitcher } from "@eventflow/i18n/react";
import { Check, ChevronDown } from "lucide-react";

import { replaceLocaleInPath } from "@shared/lib/i18n-routing";
import { cn } from "@shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import { LocaleFlag } from "@shared/ui/locale-flag";

import type { Locale } from "@eventflow/i18n";

interface LanguageSwitcherProps {
  className?: string;
  fullWidth?: boolean;
  align?: "start" | "center" | "end";
  portalContainer?: HTMLElement | null;
}

export function LanguageSwitcher({
  className,
  fullWidth = false,
  align = "end",
  portalContainer,
}: LanguageSwitcherProps): React.ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const {
    setLocale,
    options,
    currentLanguage,
    languageLabel,
    selectLanguageLabel,
    currentLanguageLabel,
  } = useLanguageSwitcher();

  const currentLocale =
    options.find((option) => option.isCurrent)?.locale ??
    options[0]?.locale ??
    "en";

  const handleSelect = (nextLocale: Locale): void => {
    setLocale(nextLocale);
    // Read search/hash at click time to avoid useSearchParams() — it would force
    // every enclosing page out of static rendering (Next 15 missing-suspense bailout).
    const search =
      typeof window === "undefined" ? "" : window.location.search;
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    const nextPath = replaceLocaleInPath(pathname, nextLocale);

    router.push(`${nextPath}${search}${hash}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "items-center rounded-full border border-[var(--border-1)] bg-white text-sm font-medium text-[var(--fg-1)] transition hover:border-[var(--ink-400)] hover:text-[var(--ink-400)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember-400)] focus-visible:ring-offset-2",
            "data-[state=open]:border-[var(--ink-400)] data-[state=open]:bg-bone-100 data-[state=open]:text-[var(--ink-400)]",
            fullWidth
              ? "flex h-auto w-full justify-between gap-2 rounded-lg px-4 py-3"
              : // Circular flag-only button on mobile (saves header space), expands to
                // a flag + label pill from sm up.
                "inline-flex size-10 justify-center gap-2 sm:w-auto sm:max-w-[10rem] sm:justify-between sm:px-3.5",
            className,
          )}
          aria-label={selectLanguageLabel}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <LocaleFlag locale={currentLocale} />
            <span
              className={cn(
                "truncate",
                !fullWidth && "hidden sm:inline",
              )}
            >
              {currentLanguage.label}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-3 shrink-0 text-[var(--fg-3)] transition-transform duration-200 data-[state=open]:rotate-180",
              !fullWidth && "hidden sm:block",
            )}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        collisionPadding={12}
        className="w-[min(17rem,calc(100vw-1.5rem))] p-2"
        container={portalContainer}
      >
        <div className="px-3 pb-2 pt-1">
          <p className="text-sm font-semibold text-ink-400">
            {languageLabel}
          </p>
          <p className="mt-1 text-xs text-ink-100">{currentLanguageLabel}</p>
        </div>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.locale}
            onSelect={() => handleSelect(option.locale)}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-between gap-3 py-2.5",
              option.isCurrent &&
                "bg-[var(--ember-50)] text-[var(--ember-500)] focus:bg-[var(--ember-50)] focus:text-[var(--ember-500)]",
            )}
            aria-current={option.isCurrent ? "true" : undefined}
          >
            <span className="flex min-w-0 items-center gap-3">
              <LocaleFlag locale={option.locale} className="h-4 w-[22px]" />
              <span className="min-w-0">
                <span className="block truncate">{option.label}</span>
                <span
                  className={cn(
                    "block text-xs",
                    option.isCurrent
                      ? "text-[var(--ember-500)]/70"
                      : "text-ink-100",
                  )}
                >
                  {option.shortLabel}
                </span>
              </span>
            </span>
            {option.isCurrent && (
              <Check className="size-4 shrink-0" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

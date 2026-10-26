"use client";

import { useT } from "@eventflow/i18n/react";
import { Building2, Check, User } from "lucide-react";

import { ACCOUNT_TYPES } from "../../model";

import type { AccountType } from "@shared/api/authService";

interface AccountTypeCardProps {
  type: AccountType;
  selected: boolean;
  onSelect: () => void;
}

const FeatureBadge = ({ text }: { text: string }): React.JSX.Element => (
  <span className="inline-flex items-center gap-1 rounded-full bg-bone-200 px-2.5 py-1 text-xs font-medium text-ink-200">
    <Check className="h-3 w-3 text-forest-400" aria-hidden="true" />
    {text}
  </span>
);

export const AccountTypeCard = ({
  type,
  selected,
  onSelect,
}: AccountTypeCardProps): React.JSX.Element => {
  const t = useT();
  const config = ACCOUNT_TYPES[type];
  const isUser = type === "user";

  const baseClass =
    "group relative flex min-h-[88px] w-full items-start gap-3 overflow-hidden rounded-xl border bg-white p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-4 sm:p-5";

  let themeClass: string;
  if (isUser) {
    themeClass = selected
      ? "border-ember-300 bg-ember-50/50 ring-1 ring-ember-200/60 focus-visible:ring-ember-200/60"
      : "border-bone-300 hover:border-ember-300 hover:bg-ember-50/40 focus-visible:ring-ember-200/60";
  } else {
    themeClass = selected
      ? "border-forest-500/40 bg-forest-50/60 ring-1 ring-forest-200/60 focus-visible:ring-forest-200/60"
      : "border-bone-300 hover:border-forest-500/40 hover:bg-forest-50/40 focus-visible:ring-forest-200/60";
  }

  const iconWrapClass = isUser
    ? "bg-ember-50 text-ember-500"
    : "bg-forest-100 text-forest-600";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${baseClass} ${themeClass}`}
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12 ${iconWrapClass}`}
      >
        {isUser ? (
          <User
            className="h-5 w-5 sm:h-6 sm:w-6"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : (
          <Building2
            className="h-5 w-5 sm:h-6 sm:w-6"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-ink-400 sm:text-lg">
            {t(config.labelKey)}
          </h3>
          {!isUser && (
            <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-forest-600">
              PRO
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-ink-100">
          {t(config.descriptionKey)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {isUser ? (
            <>
              <FeatureBadge text={t("public.auth.freeRegistration")} />
              <FeatureBadge text={t("public.auth.eventAccess")} />
            </>
          ) : (
            <>
              <FeatureBadge text={t("public.auth.eventCreation")} />
              <FeatureBadge text={t("public.auth.analytics")} />
              <FeatureBadge text={t("public.auth.qrTickets")} />
            </>
          )}
        </div>
      </div>
    </button>
  );
};

"use client";

import { useT } from "@eventflow/i18n/react";
import { Building2, User } from "lucide-react";

import { ACCOUNT_TYPES } from "../../model";

import type { AccountType } from "@shared/api/authService";

interface AccountTypePillProps {
  type: AccountType;
  onChange: () => void;
  disabled?: boolean;
}

export const AccountTypePill = ({
  type,
  onChange,
  disabled,
}: AccountTypePillProps): React.JSX.Element => {
  const t = useT();
  const config = ACCOUNT_TYPES[type];
  const isUser = type === "user";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-bone-300 bg-bone-100/60 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
            isUser
              ? "bg-ember-50 text-ember-500"
              : "bg-forest-50 text-forest-600"
          }`}
        >
          {isUser ? (
            <User className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Building2
              className="h-3.5 w-3.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-100">
            {t("public.auth.signupPage.accountTypeLabel")}
          </p>
          <p className="truncate text-sm font-semibold text-ink-400">
            {t(config.labelKey)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="rounded-md px-2 py-1 text-xs font-semibold text-ink-200 underline decoration-bone-400 underline-offset-4 transition-colors hover:text-ink-400 hover:decoration-ink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {t("public.auth.changeAccountType")}
      </button>
    </div>
  );
};

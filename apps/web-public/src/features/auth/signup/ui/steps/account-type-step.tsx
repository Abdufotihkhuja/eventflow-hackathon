"use client";

import { useT } from "@eventflow/i18n/react";

import { AccountTypeCard } from "../components/account-type-card";
import { LoginLink } from "../components/fields";

import type { AccountType } from "@shared/api/authService";

interface AccountTypeStepProps {
  selected: AccountType | null;
  onSelect: (type: AccountType) => void;
}

export const AccountTypeStep = ({
  selected,
  onSelect,
}: AccountTypeStepProps): React.JSX.Element => {
  const t = useT();

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1
          className="text-2xl font-bold text-ink-400 sm:text-3xl"
          style={{
            letterSpacing: "var(--track-snug)",
            textWrap: "balance",
          }}
        >
          {t("public.auth.signupPage.heading")}
        </h1>
        <p
          className="mt-3 text-sm text-ink-200 sm:text-base"
          style={{ lineHeight: "1.6", textWrap: "pretty" }}
        >
          {t("public.auth.signupPage.subtitle")}
        </p>
      </header>

      <p className="text-center text-sm text-ink-100">
        {t("public.auth.selectAccountType")}
      </p>

      <div
        className="grid gap-3"
        role="radiogroup"
        aria-label={t("public.auth.selectAccountType")}
      >
        <AccountTypeCard
          type="user"
          selected={selected === "user"}
          onSelect={() => onSelect("user")}
        />
        <AccountTypeCard
          type="organizer"
          selected={selected === "organizer"}
          onSelect={() => onSelect("organizer")}
        />
      </div>

      <LoginLink />
    </div>
  );
};

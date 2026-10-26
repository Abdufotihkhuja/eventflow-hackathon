"use client";

import { useT } from "@eventflow/i18n/react";
import { Check } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { cn } from "@shared/lib/utils";

import {
  evaluatePassword,
  PASSWORD_RULE_KEYS,
  type OrganizerSignupFormData,
  type PasswordRuleKey,
  type UserSignupFormData,
} from "../../model";

const RULE_LABEL_KEY: Record<PasswordRuleKey, string> = {
  length: "public.auth.passwordChecklist.length",
  lowercase: "public.auth.passwordChecklist.lowercase",
  uppercase: "public.auth.passwordChecklist.uppercase",
  number: "public.auth.passwordChecklist.number",
  special: "public.auth.passwordChecklist.special",
};

export const PasswordChecklist = (): React.JSX.Element => {
  const t = useT();
  const { control } = useFormContext<
    UserSignupFormData | OrganizerSignupFormData
  >();
  const password = useWatch({ control, name: "password" }) ?? "";
  const status = evaluatePassword(password);
  const totalMet = PASSWORD_RULE_KEYS.filter((rule) => status[rule]).length;
  const total = PASSWORD_RULE_KEYS.length;

  return (
    <div
      className="rounded-lg border border-bone-300 bg-bone-100/60 p-3"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-100">
          {t("public.auth.passwordRequirement")}
        </p>
        <p className="text-[11px] font-semibold tabular-nums text-ink-200">
          {totalMet}/{total}
        </p>
      </div>
      <ul
        className="grid gap-1.5 text-xs sm:grid-cols-2"
        aria-label={t("public.auth.passwordRequirement")}
      >
        {PASSWORD_RULE_KEYS.map((rule) => {
          const met = status[rule];
          return (
            <li
              key={rule}
              className={cn(
                "flex items-center gap-1.5 transition-colors duration-200",
                met ? "text-forest-600" : "text-ink-100"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                  met
                    ? "bg-forest-500 text-white"
                    : "border border-bone-400 bg-white text-ink-50"
                )}
              >
                {met && (
                  <Check
                    className="h-2.5 w-2.5"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span>{t(RULE_LABEL_KEY[rule])}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

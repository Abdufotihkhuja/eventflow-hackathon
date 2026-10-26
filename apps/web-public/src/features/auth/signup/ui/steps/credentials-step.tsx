"use client";

import { useId, useState } from "react";

import { type Translator } from "@eventflow/i18n";
import { useT } from "@eventflow/i18n/react";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@shared/ui/button";

import { AccountTypePill } from "../components/account-type-pill";
import {
  AcceptTermsField,
  BackButton,
  ConfirmPasswordField,
  ErrorAlert,
  PasswordField,
} from "../components/fields";
import { PasswordChecklist } from "../components/password-checklist";
import { WizardProgress } from "../components/wizard-progress";

import type { AccountType } from "@shared/api/authService";

const getSubmitLabel = ({
  isLoading,
  isUser,
  t,
}: {
  isLoading: boolean;
  isUser: boolean;
  t: Translator;
}): string => {
  if (isLoading) return t("public.auth.creatingAccount");
  if (isUser) return t("public.auth.signup");
  return t("public.auth.createOrganizerAccount");
};

interface CredentialsStepProps {
  accountType: AccountType;
  isLoading: boolean;
  rootError?: string;
  onBack: () => void;
  onChangeAccountType: () => void;
}

export const CredentialsStep = ({
  accountType,
  isLoading,
  rootError,
  onBack,
  onChangeAccountType,
}: CredentialsStepProps): React.JSX.Element => {
  const t = useT();
  const headingId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isUser = accountType === "user";

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <BackButton onClick={onBack} disabled={isLoading} />

      <div className="space-y-4">
        <WizardProgress current={3} total={3} variant={accountType} />
        <div>
          <h2
            id={headingId}
            className="text-xl font-bold leading-tight tracking-tight text-ink-400 sm:text-2xl"
          >
            {t("public.auth.signupPage.stepCredentials")}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-100">
            {t("public.auth.signupPage.stepCredentialsSubtitle")}
          </p>
        </div>
      </div>

      <AccountTypePill
        type={accountType}
        onChange={onChangeAccountType}
        disabled={isLoading}
      />

      <div className="space-y-4">
        <PasswordField
          disabled={isLoading}
          show={showPassword}
          onToggle={() => setShowPassword((prev) => !prev)}
        />
        <PasswordChecklist />
        <ConfirmPasswordField
          disabled={isLoading}
          show={showConfirm}
          onToggle={() => setShowConfirm((prev) => !prev)}
        />
      </div>

      <AcceptTermsField disabled={isLoading} />

      {rootError && <ErrorAlert message={rootError} />}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isLoading}
        className="w-full"
        leftIcon={
          isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          )
        }
      >
        {getSubmitLabel({ isLoading, isUser, t })}
      </Button>
    </section>
  );
};

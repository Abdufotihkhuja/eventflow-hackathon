"use client";

import { useId } from "react";

import { useT } from "@eventflow/i18n/react";

import { Button } from "@shared/ui/button";

import { AccountTypePill } from "../components/account-type-pill";
import {
  BackButton,
  DescriptionField,
  EmailField,
  FirstNameField,
  LastNameField,
  OrganizationNameField,
} from "../components/fields";
import { WizardProgress } from "../components/wizard-progress";

import type { AccountType } from "@shared/api/authService";

interface DetailsStepProps {
  accountType: AccountType;
  isLoading: boolean;
  onBack: () => void;
  onChangeAccountType: () => void;
  onContinue: () => void;
}

export const DetailsStep = ({
  accountType,
  isLoading,
  onBack,
  onChangeAccountType,
  onContinue,
}: DetailsStepProps): React.JSX.Element => {
  const t = useT();
  const headingId = useId();
  const isUser = accountType === "user";
  const headingKey = isUser
    ? "public.auth.signupPage.stepDetailsUser"
    : "public.auth.signupPage.stepDetailsOrganizer";

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <BackButton onClick={onBack} disabled={isLoading} />

      <div className="space-y-4">
        <WizardProgress current={2} total={3} variant={accountType} />
        <h2
          id={headingId}
          className="text-xl font-bold leading-tight tracking-tight text-ink-400 sm:text-2xl"
        >
          {t(headingKey)}
        </h2>
      </div>

      <AccountTypePill
        type={accountType}
        onChange={onChangeAccountType}
        disabled={isLoading}
      />

      <div className="space-y-5">
        {isUser ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FirstNameField disabled={isLoading} />
            <LastNameField disabled={isLoading} />
          </div>
        ) : (
          <OrganizationNameField disabled={isLoading} />
        )}

        <EmailField disabled={isLoading} />

        {!isUser && <DescriptionField disabled={isLoading} />}
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={isLoading}
        onClick={onContinue}
        className="w-full"
      >
        {t("public.auth.continueAction")}
      </Button>
    </section>
  );
};

"use client";

/**
 * Компонент верификации email с 6-значным кодом
 */

import { useState } from "react";

import { useT } from "@eventflow/i18n/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";

import { MotionFadeIn } from "@shared/ui";
import { Button } from "@shared/ui/button";
import { CodeInput } from "@shared/ui/code-input";

import { useVerifyEmailWithCode } from "../model/useVerifyEmailWithCode";

import type { SignupPlanKey } from "@shared/lib/billing-intent";

interface VerifyEmailCodeViewProps {
  email: string;
  accountType?: "user" | "organizer";
  /** Paid plan preselected by a /pricing CTA (P-7); organizer flow only. */
  plan?: SignupPlanKey | null;
}

/** Форматирование времени mm:ss */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/** Успешное состояние */
const SuccessState = (): React.JSX.Element => {
  const t = useT();

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-xl bg-forest-50 text-forest-500 sm:size-16"
        >
          <CheckCircle2 className="size-6 sm:size-7" strokeWidth={2} />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-ink-400 sm:mt-6 sm:text-3xl">
          {t("public.auth.verifyEmail.successTitle")}
        </h2>
        <p className="mt-2 text-sm text-ink-100 sm:text-base">
          {t("public.auth.verifyEmail.successDescription")}
        </p>
      </div>

      <MotionFadeIn
        direction="none"
        className="rounded-xl border border-forest-400/20 bg-forest-50/80 p-3.5 sm:p-4"
      >
        <p className="text-sm leading-relaxed text-forest-600">
          {t("public.auth.verifyEmail.redirecting")}
        </p>
      </MotionFadeIn>
    </div>
  );
};

/** Предупреждение об истечении кода */
const ExpiredCodeWarning = (): React.JSX.Element => {
  const t = useT();

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-[var(--warning-soft)] bg-ember-50 p-3.5 sm:p-4"
    >
      <AlertCircle
        className="mt-0.5 h-5 w-5 shrink-0 text-ember-500"
        strokeWidth={2}
        aria-hidden="true"
      />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-[var(--warning)]">
          {t("public.auth.codeExpired")}
        </p>
        <p className="text-sm text-[var(--warning)]">
          {t("public.auth.verifyEmail.codeExpiredHint")}
        </p>
      </div>
    </div>
  );
};

/** Заголовок */
const Header = ({ email }: { email: string }): React.JSX.Element => {
  const t = useT();

  return (
    <div className="text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex size-14 items-center justify-center rounded-xl bg-ember-50 text-ember-400 sm:size-16"
      >
        <Mail className="size-6 sm:size-7" strokeWidth={2} />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-ink-400 sm:mt-6 sm:text-3xl">
        {t("public.auth.verifyEmail.title")}
      </h2>
      <p className="mt-2 text-sm text-ink-100 sm:text-base">
        {t("public.auth.verifyEmail.sentTo")}{" "}
        <span className="break-all font-semibold text-ink-400">
          {email}
        </span>
      </p>
    </div>
  );
};

/** Таймер */
const Timer = ({ timeLeft }: { timeLeft: number }): React.JSX.Element => {
  const t = useT();

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-ink-100">
      <Clock className="h-4 w-4" strokeWidth={2} />
      <span>
        {t("public.auth.codeValidFor")} <strong>{formatTime(timeLeft)}</strong>
      </span>
    </div>
  );
};

/** Кнопка повторной отправки */
interface ResendButtonProps {
  canResend: boolean;
  isCodeExpired: boolean;
  loading: boolean;
  resendTimeLeft: number;
  onResend: () => void;
}

const ResendButton = ({
  canResend,
  isCodeExpired,
  loading,
  resendTimeLeft,
  onResend,
}: ResendButtonProps): React.JSX.Element => {
  const t = useT();

  if (canResend) {
    return (
      <Button
        variant={isCodeExpired ? "primary" : "ghost"}
        size={isCodeExpired ? "lg" : "sm"}
        className={
          isCodeExpired ? "w-full" : "text-ember-400 hover:text-ember-500"
        }
        onClick={onResend}
        disabled={loading}
        leftIcon={
          loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
          )
        }
      >
        {loading ? t("public.auth.sending") : t("public.auth.sendCodeAgain")}
      </Button>
    );
  }

  return (
    <p className="text-sm text-ink-100">
      {t("public.auth.sendAgainIn", { seconds: resendTimeLeft })}
    </p>
  );
};

export const VerifyEmailCodeView = ({
  email,
  accountType = "user",
  plan = null,
}: VerifyEmailCodeViewProps): React.JSX.Element => {
  const t = useT();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    code,
    setCode,
    timeLeft,
    resendTimeLeft,
    canResend,
    isCodeExpired,
    error,
    loading,
    verifyWithCode,
    resendCode,
  } = useVerifyEmailWithCode({ email, accountType, plan });

  // Автоматическая проверка при заполнении всех полей
  const handleCodeChange = (newCode: string[]): void => {
    setCode(newCode);
    if (newCode.every((digit) => digit !== "")) {
      void verifyWithCode(newCode).then((success) => {
        if (success) setIsSuccess(true);
      });
    }
  };

  // Обработчик кнопки "Подтвердить"
  const handleSubmit = async (): Promise<void> => {
    const success = await verifyWithCode(code);
    if (success) setIsSuccess(true);
  };

  if (isSuccess) return <SuccessState />;

  return (
    <div className="space-y-5">
      <Header email={email} />

      {isCodeExpired && <ExpiredCodeWarning />}

      <CodeInput
        code={code}
        onChange={handleCodeChange}
        error={error}
        disabled={loading || isCodeExpired}
      />

      {!isCodeExpired && <Timer timeLeft={timeLeft} />}

      {!isCodeExpired && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => void handleSubmit()}
          disabled={loading || code.join("").length !== 6}
          leftIcon={
            loading ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined
          }
        >
          {loading ? t("public.auth.verifyEmail.checking") : t("actions.confirm")}
        </Button>
      )}

      <div className="text-center">
        <ResendButton
          canResend={canResend}
          isCodeExpired={isCodeExpired}
          loading={loading}
          resendTimeLeft={resendTimeLeft}
          onResend={() => void resendCode()}
        />
      </div>

      <div className="rounded-xl border border-bone-300 bg-bone-100 p-3.5 sm:p-4">
        <p className="text-sm leading-relaxed text-ink-100">
          {t("public.auth.verifyEmail.didNotReceive")}
        </p>
      </div>
    </div>
  );
};

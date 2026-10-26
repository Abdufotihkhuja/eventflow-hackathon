"use client";

/**
 * Форма сброса пароля с кодом верификации
 */

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { VerificationCodeTypeEnum } from "@shared/api";
import { useEmailVerification } from "@shared/lib/hooks";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { Button } from "@shared/ui/button";
import { CodeInput } from "@shared/ui/code-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";

import { useResetPasswordWithCode } from "../model/useResetPasswordWithCode";

const SPECIAL_CHARS_REGEX = /[@$!%*?&]/;

// Schema для валидации пароля
const createResetPasswordCodeSchema = (t: ReturnType<typeof useT>) =>
  z
    .object({
      newPassword: z
        .string()
        .min(8, t("public.auth.validation.passwordMin"))
        .regex(/[A-Z]/, t("public.auth.validation.passwordUppercase"))
        .regex(/[a-z]/, t("public.auth.validation.passwordLowercase"))
        .regex(/[0-9]/, t("public.auth.validation.passwordNumber"))
        .regex(
          SPECIAL_CHARS_REGEX,
          t("public.auth.validation.passwordSpecial")
        ),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });

type ResetPasswordCodeFormData = z.infer<
  ReturnType<typeof createResetPasswordCodeSchema>
>;

interface ResetPasswordCodeFormProps {
  email: string;
  workspaceLoginUrl?: string;
}

/** Форматирование времени mm:ss */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/** Алерт ошибки */
const ErrorAlert = ({ message }: { message: string }): React.JSX.Element => (
  <div
    className="flex items-start gap-3 rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-4"
    role="alert"
    aria-live="polite"
  >
    <AlertCircle
      className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger)]"
      strokeWidth={2}
      aria-hidden="true"
    />
    <p className="text-sm font-medium text-[var(--danger)]">{message}</p>
  </div>
);

/** Сообщение об успехе */
const SuccessMessage = (): React.JSX.Element => {
  const t = useT();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-forest-100 bg-forest-50 p-4">
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-forest-400"
          strokeWidth={2}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-forest-500">
            {t("public.auth.passwordChanged")}
          </p>
          <p className="text-sm text-forest-500">
            {t("public.auth.redirectingToLogin")}
          </p>
        </div>
      </div>
    </div>
  );
};

/** Предупреждение об истечении кода */
const ExpiredCodeWarning = (): React.JSX.Element => {
  const t = useT();

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--warning-soft)] bg-ember-50 p-4">
      <AlertCircle
        className="mt-0.5 h-5 w-5 shrink-0 text-ember-400"
        strokeWidth={2}
      />
      <div>
        <p className="text-sm font-medium text-[var(--warning)]">
          {t("public.auth.codeExpired")}
        </p>
        <p className="text-sm text-[var(--warning)]">
          {t("public.auth.codeExpiredHint")}
        </p>
      </div>
    </div>
  );
};

/** Секция ввода кода */
interface CodeSectionProps {
  code: string[];
  setCode: (code: string[]) => void;
  codeError: string;
  isLoading: boolean;
  isCodeExpired: boolean;
  timeLeft: number;
  canResend: boolean;
  codeLoading: boolean;
  resendTimeLeft: number;
  onResend: () => void;
}

const CodeSection = ({
  code,
  setCode,
  codeError,
  isLoading,
  isCodeExpired,
  timeLeft,
  canResend,
  codeLoading,
  resendTimeLeft,
  onResend,
}: CodeSectionProps): React.JSX.Element => (
  <CodeSectionInner
    code={code}
    setCode={setCode}
    codeError={codeError}
    isLoading={isLoading}
    isCodeExpired={isCodeExpired}
    timeLeft={timeLeft}
    canResend={canResend}
    codeLoading={codeLoading}
    resendTimeLeft={resendTimeLeft}
    onResend={onResend}
  />
);

const CodeSectionInner = ({
  code,
  setCode,
  codeError,
  isLoading,
  isCodeExpired,
  timeLeft,
  canResend,
  codeLoading,
  resendTimeLeft,
  onResend,
}: CodeSectionProps): React.JSX.Element => {
  const t = useT();

  return (
    <div className="space-y-3">
      <Label className="block text-center text-sm font-semibold text-ink-400">
        {t("public.auth.codeFromEmail")}
      </Label>
      <CodeInput
        code={code}
        onChange={setCode}
        error={codeError}
        disabled={isLoading || isCodeExpired}
      />

      {!isCodeExpired && (
        <div className="flex items-center justify-center gap-2 text-sm text-ink-100">
          <Clock className="h-4 w-4" strokeWidth={2} />
          <span>
            {t("public.auth.codeValidFor")}{" "}
            <strong>{formatTime(timeLeft)}</strong>
          </span>
        </div>
      )}

      <div className="text-center">
        {canResend ? (
          <Button
            type="button"
            variant={isCodeExpired ? "primary" : "ghost"}
            size={isCodeExpired ? "md" : "sm"}
            onClick={onResend}
            disabled={isLoading}
            leftIcon={
              codeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" strokeWidth={2} />
              )
            }
            className={
              isCodeExpired ? "w-full" : "text-ember-400 hover:text-ember-500"
            }
          >
            {codeLoading
              ? t("public.auth.sending")
              : t("public.auth.sendCodeAgain")}
          </Button>
        ) : (
          <p className="text-sm text-ink-100">
            {t("public.auth.sendAgainIn", { seconds: resendTimeLeft })}
          </p>
        )}
      </div>
    </div>
  );
};

/** Поле пароля */
interface PasswordFieldProps {
  label: string;
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  name: "newPassword" | "confirmPassword";
}

const PasswordField = ({
  label,
  show,
  onToggle,
  disabled,
  icon,
  name,
}: PasswordFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<ResetPasswordCodeFormData, "newPassword" | "confirmPassword">
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              {icon}
            </div>
            <FormControl>
              <Input
                type={show ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={disabled}
                hasError={!!fieldState.error}
                className="pl-10 pr-10"
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={onToggle}
              className="absolute inset-y-0 right-3 flex items-center text-ink-50 transition hover:text-ink-100 focus:outline-none"
              aria-label={
                show
                  ? t("public.auth.hidePassword")
                  : t("public.auth.showPassword")
              }
            >
              {show ? (
                <EyeOff className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

/* eslint-disable complexity */
export const ResetPasswordCodeForm = ({
  email,
  workspaceLoginUrl,
}: ResetPasswordCodeFormProps): React.JSX.Element => {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetMutation = useResetPasswordWithCode();

  const {
    code,
    setCode,
    timeLeft,
    resendTimeLeft,
    canResend,
    isCodeExpired,
    error: codeError,
    loading: codeLoading,
    resendCode,
  } = useEmailVerification({
    email,
    type: VerificationCodeTypeEnum.PASSWORD_RESET,
  });

  const form = useForm<ResetPasswordCodeFormData>({
    resolver: zodResolver(createResetPasswordCodeSchema(t)),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = form;

  const onSubmit = (data: ResetPasswordCodeFormData): void => {
    const codeString = code.join("");
    if (codeString.length !== 6) {
      setError("root", { message: t("public.auth.enterSixDigits") });
      return;
    }

    if (isCodeExpired) {
      setError("root", { message: t("public.auth.requestNewCode") });
      return;
    }

    resetMutation.mutate(
      {
        email,
        code: codeString,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
          setTimeout(() => {
            if (workspaceLoginUrl) {
              window.location.assign(workspaceLoginUrl);
              return;
            }
            router.push(withLocalePath("/login?passwordReset=true", locale));
          }, 2000);
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : t("public.auth.resetPasswordError");
          setError("root", { message });
        },
      }
    );
  };

  const isLoading = isSubmitting || resetMutation.isPending || codeLoading;

  if (isSuccess) return <SuccessMessage />;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-6"
      >
        <div className="text-center">
          <p className="text-sm text-ink-100">
            {t("public.auth.codeSentTo")}{" "}
            <span className="font-semibold text-ink-400">{email}</span>
          </p>
        </div>

        {isCodeExpired && <ExpiredCodeWarning />}

        <CodeSection
          code={code}
          setCode={setCode}
          codeError={codeError}
          isLoading={isLoading}
          isCodeExpired={isCodeExpired}
          timeLeft={timeLeft}
          canResend={canResend}
          codeLoading={codeLoading}
          resendTimeLeft={resendTimeLeft}
          onResend={() => void resendCode()}
        />

        {!isCodeExpired && (
          <>
            <PasswordField
              label={t("public.auth.newPassword")}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              icon={
                <KeyRound
                  className="h-5 w-5 text-ink-50"
                  aria-hidden="true"
                  strokeWidth={2}
                />
              }
              name="newPassword"
            />

            <PasswordField
              label={t("public.auth.confirmPassword")}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              icon={
                <ShieldCheck
                  className="h-5 w-5 text-ink-50"
                  aria-hidden="true"
                  strokeWidth={2}
                />
              }
              name="confirmPassword"
            />

            {errors.root?.message && (
              <ErrorAlert message={errors.root.message} />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading || code.join("").length !== 6}
              className="w-full"
              leftIcon={
                isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-5 w-5" strokeWidth={2} />
                )
              }
            >
              {isLoading
                ? t("public.auth.passwordResetting")
                : t("public.auth.resetPassword")}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
};

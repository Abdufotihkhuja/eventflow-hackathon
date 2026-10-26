"use client";

/**
 * Компонент смены email с верификацией кодом
 */

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useT } from "@eventflow/i18n/react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  VerificationCodeTypeEnum,
  type ChangeEmailRequest,
  type ChangeEmailConfirmRequest,
  type ApiResponse,
  type ChangeEmailResponse,
  verificationService,
} from "@shared/api";
import { useEmailVerification } from "@shared/lib/hooks";
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

const buildRequestChangeEmailSchema = (t: ReturnType<typeof useT>) => z.object({
  newEmail: z
    .string()
    .email(t("validation.invalidEmail"))
    .min(1, t("public.auth.validation.emailRequired")),
  currentPassword: z.string().min(1, t("public.profile.changeEmail.passwordRequired")),
});

type RequestChangeEmailData = z.infer<ReturnType<typeof buildRequestChangeEmailSchema>>;

interface ChangeEmailFormProps {
  currentEmail: string;
  onSuccess: (newEmail: string) => void;
  onError: (message: string) => void;
}

/** Форматирование времени mm:ss */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          {t("public.profile.changeEmail.codeExpiredHint")}
        </p>
      </div>
    </div>
  );
};

/** Форма запроса смены email */
interface RequestFormProps {
  currentEmail: string;
  isPending: boolean;
  onSubmit: (data: RequestChangeEmailData) => void;
}

const RequestForm = ({
  currentEmail,
  isPending,
  onSubmit,
}: RequestFormProps): React.JSX.Element => {
  const t = useT();
  const form = useForm<RequestChangeEmailData>({
    resolver: zodResolver(buildRequestChangeEmailSchema(t)),
    defaultValues: { newEmail: "", currentPassword: "" },
  });
  const { handleSubmit } = form;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-6"
      >
        <div className="rounded-xl border border-bone-300/50 bg-bone-100/50 p-4">
          <p className="text-sm text-ink-100">
            {t("public.profile.changeEmail.currentEmail")}:{" "}
            <span className="font-semibold text-ink-400">{currentEmail}</span>
          </p>
        </div>

        <FormField<RequestChangeEmailData, "newEmail">
          name="newEmail"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t("public.profile.changeEmail.newEmail")}</FormLabel>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Mail
                    className="h-5 w-5 text-ink-50"
                    aria-hidden="true"
                    strokeWidth={2}
                  />
                </div>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="newemail@example.com"
                    autoComplete="email"
                    disabled={isPending}
                    hasError={!!fieldState.error}
                    className="pl-10"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField<RequestChangeEmailData, "currentPassword">
          name="currentPassword"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                {t("public.profile.settings.fields.currentPassword")}
              </FormLabel>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <KeyRound
                    className="h-5 w-5 text-ink-50"
                    aria-hidden="true"
                    strokeWidth={2}
                  />
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t(
                      "public.profile.settings.placeholders.currentPassword"
                    )}
                    autoComplete="current-password"
                    disabled={isPending}
                    hasError={!!fieldState.error}
                    className="pl-10"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          className="w-full"
          leftIcon={
            isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mail className="h-5 w-5" strokeWidth={2} />
            )
          }
        >
          {isPending
            ? t("public.auth.sending")
            : t("public.profile.changeEmail.sendCodeToNewEmail")}
        </Button>
      </form>
    </Form>
  );
};

/** Шаг подтверждения с кодом */
interface ConfirmStepProps {
  newEmail: string;
  onConfirm: (data: ChangeEmailConfirmRequest) => void;
  isLoading: boolean;
  onBack: () => void;
}

/* eslint-disable complexity */
const ConfirmStep = ({
  newEmail,
  onConfirm,
  isLoading,
  onBack,
}: ConfirmStepProps): React.JSX.Element => {
  const t = useT();
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
    email: newEmail,
    type: VerificationCodeTypeEnum.EMAIL_CHANGE,
  });

  const handleSubmit = (): void => {
    const codeString = code.join("");
    if (codeString.length !== 6 || isCodeExpired) return;
    onConfirm({ code: codeString, newEmail });
  };

  const allLoading = isLoading || codeLoading;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-ink-100">
          {t("public.auth.codeSentTo")}{" "}
          <span className="font-semibold text-ink-400">{newEmail}</span>
        </p>
      </div>

      {isCodeExpired && <ExpiredCodeWarning />}

      <div className="space-y-3">
        <Label className="block text-center text-sm font-semibold text-ink-400">
          {t("public.auth.codeFromEmail")}
        </Label>
        <CodeInput
          code={code}
          onChange={setCode}
          error={codeError}
          disabled={allLoading || isCodeExpired}
        />

        {!isCodeExpired && (
          <div className="flex items-center justify-center gap-2 text-sm text-ink-100">
            <Clock className="h-4 w-4" strokeWidth={2} />
            <span>
              {t("public.auth.codeValidFor")} <strong>{formatTime(timeLeft)}</strong>
            </span>
          </div>
        )}

        <div className="text-center">
          {canResend ? (
            <Button
              type="button"
              variant={isCodeExpired ? "primary" : "ghost"}
              size={isCodeExpired ? "md" : "sm"}
              onClick={() => void resendCode()}
              disabled={allLoading}
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
              {codeLoading ? t("public.auth.sending") : t("public.auth.sendCodeAgain")}
            </Button>
          ) : (
            <p className="text-sm text-ink-100">
              {t("public.auth.sendAgainIn", { seconds: resendTimeLeft })}
            </p>
          )}
        </div>
      </div>

      {!isCodeExpired && (
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={allLoading || code.join("").length !== 6}
          className="w-full"
          leftIcon={
            isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" strokeWidth={2} />
            )
          }
        >
          {isLoading
            ? t("public.profile.settings.actions.confirming")
            : t("public.profile.changeEmail.confirmChange")}
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onBack}
        className="w-full"
      >
        {t("actions.back")}
      </Button>
    </div>
  );
};

export const ChangeEmailForm = ({
  currentEmail,
  onSuccess,
  onError,
}: ChangeEmailFormProps): React.JSX.Element => {
  const t = useT();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [requestedEmail, setRequestedEmail] = useState("");

  const requestMutation = useMutation<ApiResponse, Error, ChangeEmailRequest>({
    mutationFn: (data) => verificationService.requestEmailChange(data),
    onSuccess: () => setStep("confirm"),
    onError: (err) => onError(err.message || t("public.profile.changeEmail.sendCodeError")),
  });

  const confirmMutation = useMutation<
    ChangeEmailResponse,
    Error,
    ChangeEmailConfirmRequest
  >({
    mutationFn: (data) => verificationService.confirmEmailChange(data),
    onSuccess: (response) => onSuccess(response.newEmail),
    onError: (err) => onError(err.message || t("public.profile.changeEmail.changeEmailError")),
  });

  const onSubmitRequest = (data: RequestChangeEmailData): void => {
    setRequestedEmail(data.newEmail);
    requestMutation.mutate({
      newEmail: data.newEmail,
      password: data.currentPassword,
    });
  };

  if (step === "confirm") {
    return (
      <ConfirmStep
        newEmail={requestedEmail}
        onConfirm={confirmMutation.mutate}
        isLoading={confirmMutation.isPending}
        onBack={() => setStep("request")}
      />
    );
  }

  return (
    <RequestForm
      currentEmail={currentEmail}
      isPending={requestMutation.isPending}
      onSubmit={onSubmitRequest}
    />
  );
};

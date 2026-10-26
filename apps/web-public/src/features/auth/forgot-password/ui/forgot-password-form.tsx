"use client";

/**
 * Форма восстановления пароля - отправка кода на email
 */

import { useRouter } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Mail, Send } from "lucide-react";
import { useForm } from "react-hook-form";

import { organizerLoginUrl } from "@shared/config/urls";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { Button } from "@shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import { Input } from "@shared/ui/input";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

import {
  createForgotPasswordSchema,
  type ForgotPasswordFormData,
  useSendResetCode,
} from "../model";

interface ForgotPasswordFormProps {
  defaultEmail?: string;
  source?: "public" | "workspace";
}

export const ForgotPasswordForm = ({
  defaultEmail = "",
  source = "public",
}: ForgotPasswordFormProps): React.JSX.Element => {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const sendCodeMutation = useSendResetCode();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(createForgotPasswordSchema(t)),
    defaultValues: {
      email: defaultEmail,
    },
  });
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = form;

  const onSubmit = (data: ForgotPasswordFormData): void => {
    sendCodeMutation.mutate(data.email, {
      onSuccess: () => {
        // Перенаправляем на страницу reset-password для ввода кода
        const resetPath = `/reset-password?email=${encodeURIComponent(
          data.email
        )}${source === "workspace" ? "&source=workspace" : ""}`;
        router.push(withLocalePath(resetPath, locale));
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : t("public.auth.sendCodeError");
        setError("root", { message });
      },
    });
  };

  const isLoading = isSubmitting || sendCodeMutation.isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        className="space-y-6"
      >
        <EmailField disabled={isLoading} />

        {errors.root?.message && <ErrorAlert message={errors.root.message} />}

        <SubmitButton isLoading={isLoading} />
        <BackToLoginLink email={form.getValues("email")} source={source} />
      </form>
    </Form>
  );
};

const EmailField = ({
  disabled,
}: {
  disabled: boolean;
}): React.JSX.Element => (
  <FormField<ForgotPasswordFormData, "email">
    name="email"
    render={({ field, fieldState }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
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
              placeholder="your@email.com"
              autoComplete="email"
              disabled={disabled}
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
);

/**
 * Error alert component
 */
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

/**
 * Submit button component
 */
const SubmitButton = ({
  isLoading,
}: {
  isLoading: boolean;
}): React.JSX.Element => {
  const t = useT();

  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      disabled={isLoading}
      className="w-full"
      leftIcon={
        isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" strokeWidth={2} />
        )
      }
    >
      {isLoading ? t("public.auth.sending") : t("public.auth.sendCode")}
    </Button>
  );
};

/**
 * Back to login link component
 */
const BackToLoginLink = ({
  email,
  source,
}: {
  email: string;
  source: "public" | "workspace";
}): React.JSX.Element => {
  const t = useT();
  const workspaceUrl = new URL(organizerLoginUrl);
  if (email.trim()) {
    workspaceUrl.searchParams.set("email", email.trim());
  }

  return (
    <p className="text-center text-sm text-ink-100">
      {t("public.auth.forgotRemembered")}{" "}
      <Link
        href={source === "workspace" ? workspaceUrl.toString() : "/login"}
        className="font-semibold text-ember-400 transition hover:text-ember-300 focus:outline-none focus-visible:underline"
      >
        {t("public.auth.loginLink")}
      </Link>
    </p>
  );
};

"use client";

/**
 * Форма входа для пользователей
 * Организаторы должны использовать отдельное workspace-приложение.
 */

import { useState } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { useT } from "@eventflow/i18n/react";
import { organizerLoginUrl } from "@shared/config/urls";
import { Button } from "@shared/ui/button";
import { Checkbox } from "@shared/ui/checkbox";
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

import { loginSchema, type LoginFormData, useLoginMutation } from "../model";

interface LoginFormProps {
  redirectTo?: string;
}

export const LoginForm = ({
  redirectTo = "/",
}: LoginFormProps): React.JSX.Element => {
  const t = useT();
  const router = useRouter();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";
  const [showPassword, setShowPassword] = useState(false);
  const [organizationAccountEmail, setOrganizationAccountEmail] = useState<
    string | null
  >(null);
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = form;

  const onSubmit = (data: LoginFormData): void => {
    form.clearErrors("root");
    setOrganizationAccountEmail(null);
    loginMutation.mutate(data, {
      onSuccess: (result) => {
        if (result.accountType === "organization") {
          setOrganizationAccountEmail(result.email);
          return;
        }
        router.replace(safeRedirect);
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : t("public.auth.loginError");
        setError("root", { message });
      },
    });
  };

  const isLoading = isSubmitting || loginMutation.isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        className="space-y-5"
      >
        <EmailField disabled={isLoading} />
        <PasswordField
          disabled={isLoading}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
        <RememberMeSection disabled={isLoading} />

        {organizationAccountEmail ? (
          <OrganizationAccountNotice
            email={organizationAccountEmail}
            onUseAnotherAccount={() => {
              setOrganizationAccountEmail(null);
              form.reset({ email: "", password: "", rememberMe: false });
              form.setFocus("email");
            }}
          />
        ) : (
          <>
            {errors.root?.message && (
              <ErrorAlert message={errors.root.message} />
            )}
            <SubmitButton isLoading={isLoading} />
            <OrganizerLoginLink />
            <SignUpLink />
          </>
        )}
      </form>
    </Form>
  );
};

// ============================================================================
// Form Fields
// ============================================================================

const EmailField = ({
  disabled,
}: {
  disabled: boolean;
}): React.JSX.Element => {
  const t = useT();

  return (
    <FormField
      name="email"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{t("public.auth.email")}</FormLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
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
};

interface PasswordFieldProps {
  disabled: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
}

const PasswordField = ({
  disabled,
  showPassword,
  onTogglePassword,
}: PasswordFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField
      name="password"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{t("public.auth.password")}</FormLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
              <KeyRound
                className="h-5 w-5 text-ink-50"
                aria-hidden="true"
                strokeWidth={2}
              />
            </div>
            <FormControl>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={disabled}
                hasError={!!fieldState.error}
                className="pl-10 pr-10"
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute inset-y-0 right-1 z-10 flex w-10 items-center justify-center rounded-md text-ink-50 transition hover:text-ink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60"
              aria-label={
                showPassword
                  ? t("public.auth.hidePassword")
                  : t("public.auth.showPassword")
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const RememberMeSection = ({
  disabled,
}: {
  disabled: boolean;
}): React.JSX.Element => {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <FormField
        name="rememberMe"
        render={({ field }) => (
          <Label className="group flex min-h-[40px] cursor-pointer items-center gap-2">
            <Checkbox
              disabled={disabled}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(!!checked)}
            />
            <span className="text-sm font-medium text-ink-100">
              {t("public.auth.rememberMe")}
            </span>
          </Label>
        )}
      />
      <Link
        href="/forgot-password"
        className="text-sm font-semibold text-ember-400 transition hover:text-ember-300 focus:outline-none focus-visible:underline"
      >
        {t("public.auth.forgotPassword")}
      </Link>
    </div>
  );
};

// ============================================================================
// UI Components
// ============================================================================

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

const OrganizationAccountNotice = ({
  email,
  onUseAnotherAccount,
}: {
  email: string;
  onUseAnotherAccount: () => void;
}): React.JSX.Element => {
  const t = useT();

  const openWorkspace = (): void => {
    const destination = new URL(organizerLoginUrl);
    destination.searchParams.set("email", email);
    destination.searchParams.set("source", "public-login");
    window.location.assign(destination.toString());
  };

  return (
    <div
      className="space-y-3 rounded-xl border border-forest-200 bg-forest-50 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Building2
          className="mt-0.5 h-5 w-5 shrink-0 text-forest-500"
          strokeWidth={2}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-300">
            {t("public.auth.organizationAccountDetectedTitle")}
          </p>
          <p className="text-sm leading-6 text-ink-100">
            {t("public.auth.organizationAccountDetectedDescription")}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="violet"
        size="md"
        className="w-full"
        onClick={openWorkspace}
        rightIcon={<ExternalLink className="h-4 w-4" strokeWidth={2} />}
      >
        {t("public.auth.organizationAccountDetectedAction")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={onUseAnotherAccount}
      >
        {t("public.auth.organizationAccountDetectedOther")}
      </Button>
    </div>
  );
};

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
          <LogIn className="h-5 w-5" strokeWidth={2} />
        )
      }
    >
      {isLoading ? t("public.auth.loggingIn") : t("public.auth.login")}
    </Button>
  );
};

/**
 * Ссылка на вход для организаторов
 */
const OrganizerLoginLink = (): React.JSX.Element => <OrganizerLoginDivider />;

function OrganizerLoginDivider(): React.JSX.Element {
  const t = useT();

  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-ink-400/10" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-white px-4 text-ink-50">
          {t("public.auth.or")}
        </span>
      </div>
    </div>
  );
}

const SignUpLink = (): React.JSX.Element => {
  const t = useT();

  return (
    <div className="space-y-4">
      {/* Organizer Login */}
      <Button
        variant="violet"
        size="lg"
        className="w-full"
        onClick={() =>
          window.open(organizerLoginUrl, "_blank", "noopener,noreferrer")
        }
        leftIcon={<Building2 className="h-5 w-5" strokeWidth={2} />}
        rightIcon={
          <ExternalLink className="h-4 w-4 opacity-60" strokeWidth={2} />
        }
      >
        {t("public.auth.organizerLogin")}
      </Button>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-ink-100">
        {t("public.auth.noAccount")}{" "}
        <Link
          href="/signup"
          className="group inline-flex items-center gap-1.5 font-semibold text-ember-400 transition hover:text-ember-300 focus:outline-none focus-visible:underline"
        >
          <UserPlus
            className="h-4 w-4 transition group-hover:scale-110"
            strokeWidth={2}
            aria-hidden="true"
          />
          {t("public.auth.signup")}
        </Link>
      </p>
    </div>
  );
};

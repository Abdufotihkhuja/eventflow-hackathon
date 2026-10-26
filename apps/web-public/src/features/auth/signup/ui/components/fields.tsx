"use client";

import { useT } from "@eventflow/i18n/react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User,
} from "lucide-react";
import { useFormContext } from "react-hook-form";

import { Checkbox } from "@shared/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { Textarea } from "@shared/ui/textarea";

import type {
  OrganizerSignupFormData,
  UserSignupFormData,
} from "../../model";

type AnySignupForm = UserSignupFormData | OrganizerSignupFormData;

interface BaseFieldProps {
  disabled: boolean;
}

export const FirstNameField = ({
  disabled,
}: BaseFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<UserSignupFormData, "firstName">
      name="firstName"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{t("public.auth.firstName")}</FormLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
              <User
                className="h-5 w-5 text-ink-50"
                aria-hidden="true"
                strokeWidth={2}
              />
            </div>
            <FormControl>
              <Input
                type="text"
                placeholder={t("public.auth.firstNamePlaceholder")}
                autoComplete="given-name"
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

export const LastNameField = ({
  disabled,
}: BaseFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<UserSignupFormData, "lastName">
      name="lastName"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{t("public.auth.lastName")}</FormLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
              <User
                className="h-5 w-5 text-ink-50"
                aria-hidden="true"
                strokeWidth={2}
              />
            </div>
            <FormControl>
              <Input
                type="text"
                placeholder={t("public.auth.lastNamePlaceholder")}
                autoComplete="family-name"
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

export const OrganizationNameField = ({
  disabled,
}: BaseFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<OrganizerSignupFormData, "organizationName">
      name="organizationName"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{t("public.auth.organizationName")}</FormLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
              <Building2
                className="h-5 w-5 text-ink-50"
                aria-hidden="true"
                strokeWidth={2}
              />
            </div>
            <FormControl>
              <Input
                type="text"
                placeholder="EventFlow Inc."
                autoComplete="organization"
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

export const EmailField = ({
  disabled,
}: BaseFieldProps): React.JSX.Element => {
  return (
    <FormField<AnySignupForm, "email">
      name="email"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
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

interface PasswordFieldProps extends BaseFieldProps {
  show: boolean;
  onToggle: () => void;
}

export const PasswordField = ({
  disabled,
  show,
  onToggle,
}: PasswordFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<AnySignupForm, "password">
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
                type={show ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={disabled}
                hasError={!!fieldState.error}
                className="pl-10 pr-12"
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={onToggle}
              className="absolute inset-y-0 right-1 z-10 flex w-11 items-center justify-center rounded-md text-ink-50 transition hover:text-ink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60"
              aria-label={
                show
                  ? t("public.auth.hidePassword")
                  : t("public.auth.showPassword")
              }
            >
              {show ? (
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

export const ConfirmPasswordField = ({
  disabled,
  show,
  onToggle,
}: PasswordFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<AnySignupForm, "passwordConfirm">
      name="passwordConfirm"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{t("public.auth.confirmPassword")}</FormLabel>
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
                type={show ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={disabled}
                hasError={!!fieldState.error}
                className="pl-10 pr-12"
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={onToggle}
              className="absolute inset-y-0 right-1 z-10 flex w-11 items-center justify-center rounded-md text-ink-50 transition hover:text-ink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60"
              aria-label={
                show
                  ? t("public.auth.hidePassword")
                  : t("public.auth.showPassword")
              }
            >
              {show ? (
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

export const DescriptionField = ({
  disabled,
}: BaseFieldProps): React.JSX.Element => {
  const t = useT();
  const { register } = useFormContext<OrganizerSignupFormData>();

  return (
    <FormField<OrganizerSignupFormData, "description">
      name="description"
      render={({ fieldState }) => (
        <FormItem>
          <FormLabel>
            {t("public.auth.organizationDescription")}{" "}
            <span className="font-normal text-ink-50">
              ({t("common.optional").toLowerCase()})
            </span>
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={t("public.auth.organizationDescriptionPlaceholder")}
              disabled={disabled}
              rows={3}
              className={
                fieldState.error
                  ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-soft)]"
                  : ""
              }
              {...register("description")}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export const AcceptTermsField = ({
  disabled,
}: BaseFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<AnySignupForm, "acceptTerms">
      name="acceptTerms"
      render={({ field }) => (
        <FormItem>
          <Label className="group flex cursor-pointer items-start gap-3">
            <FormControl>
              <Checkbox
                disabled={disabled}
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                name={field.name}
              />
            </FormControl>
            <span className="text-sm text-ink-100">
              {t("public.auth.acceptTermsPrefix")}{" "}
              <Link
                href="/terms"
                className="font-semibold text-ember-500 underline decoration-ember-500/40 underline-offset-4 transition-colors hover:text-ember-600 hover:decoration-ember-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 rounded-sm"
              >
                {t("public.auth.terms")}
              </Link>{" "}
              {t("public.auth.and")}{" "}
              <Link
                href="/privacy"
                className="font-semibold text-ember-500 underline decoration-ember-500/40 underline-offset-4 transition-colors hover:text-ember-600 hover:decoration-ember-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 rounded-sm"
              >
                {t("public.auth.privacy")}
              </Link>
            </span>
          </Label>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export const ErrorAlert = ({
  message,
}: {
  message: string;
}): React.JSX.Element => (
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

export const BackButton = ({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}): React.JSX.Element => {
  const t = useT();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group -ml-2 inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[13px] font-semibold text-ink-100 transition-colors hover:text-ink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 disabled:opacity-50"
    >
      <ArrowLeft
        className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
      {t("public.auth.backAction")}
    </button>
  );
};

export const LoginLink = (): React.JSX.Element => {
  const t = useT();

  return (
    <p className="text-center text-sm text-ink-100">
      {t("public.auth.alreadyHaveAccount")}{" "}
      <Link
        href="/login"
        className="font-semibold text-ember-500 underline decoration-ember-500/40 underline-offset-4 transition-colors hover:text-ember-600 hover:decoration-ember-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 rounded-sm"
      >
        {t("public.auth.loginLink")}
      </Link>
    </p>
  );
};

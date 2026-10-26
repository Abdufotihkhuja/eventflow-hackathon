"use client";

/**
 * Страница настройки организации для новых пользователей после верификации email
 * Требует подтверждённый email для доступа
 */

import { useState, useEffect } from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useT } from "@eventflow/i18n/react";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { organizationsService, authService } from "@shared/api";
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
import { MotionFadeIn } from "@shared/ui/motion";
import { Textarea } from "@shared/ui/textarea";

// ============================================================================
// Schema
// ============================================================================

const buildOrganizationSetupSchema = (t: ReturnType<typeof useT>) => z.object({
  organizationName: z
    .string()
    .min(2, t("public.auth.validation.organizationNameMin"))
    .max(100, t("public.auth.validation.organizationNameMax")),
  inn: z
    .string()
    .min(9, t("public.auth.organizationSetup.validation.innMin"))
    .max(20, t("public.auth.organizationSetup.validation.innMax"))
    .regex(/^\d+$/, t("public.auth.organizationSetup.validation.innDigits")),
  legalAddress: z
    .string()
    .min(10, t("public.auth.organizationSetup.validation.legalAddressMin"))
    .max(200, t("public.auth.organizationSetup.validation.legalAddressMax")),
  description: z
    .string()
    .max(500, t("public.auth.validation.organizationDescriptionMax"))
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url(t("validation.invalidUrl"))
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, t("public.auth.organizationSetup.validation.phone"))
    .optional()
    .or(z.literal("")),
});

type OrganizationSetupFormData = z.infer<ReturnType<typeof buildOrganizationSetupSchema>>;

// ============================================================================
// Utils
// ============================================================================

/**
 * Очищает телефон от спецсимволов (оставляет только цифры и +)
 */
function cleanPhoneNumber(phone: string | undefined): string | undefined {
  return phone ? phone.replace(/[^\d+]/g, "") : undefined;
}

// ============================================================================
// Components
// ============================================================================

const PageHeader = (): React.JSX.Element => {
  const t = useT();

  return (
  <>
    <div className="mb-8 text-center">
      <Link
        href="/"
        className="inline-block transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200/60 focus-visible:ring-offset-2"
      >
        <Image
          src="/assets/logo.svg"
          alt="EVENTFLOW"
          width={180}
          height={48}
          priority
          className="mx-auto"
        />
      </Link>
    </div>
    <div className="mb-8 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-forest-50/80 px-4 py-1.5 text-sm font-medium text-forest-600">
        {t("public.auth.organizationSetup.badge")}
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-ink-400">
        {t("public.auth.organizationSetup.title")}
      </h1>
      <p className="mt-2 text-base text-ink-100">
        {t("public.auth.organizationSetup.description")}
      </p>
    </div>
  </>
  );
};

const ErrorAlert = ({ message }: { message: string }): React.JSX.Element => (
  <div className="rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)]">
        <svg
          className="h-3 w-3 text-[var(--danger)]"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--danger)]">{message}</p>
    </div>
  </div>
);

const InfoNotice = (): React.JSX.Element => {
  const t = useT();

  return (
    <div className="rounded-xl border-2 border-forest-100 bg-forest-50 p-4">
      <p className="text-sm text-forest-600">
        <strong className="font-semibold text-forest-600">
          {t("public.auth.organizationSetup.noticeTitle")}:
        </strong>{" "}
        {t("public.auth.organizationSetup.noticeBefore")}{" "}
        <a
          href="https://app.eventflow.uz"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline transition hover:text-forest-500"
        >
          app.eventflow.uz
        </a>
      </p>
    </div>
  );
};

// ============================================================================
// Form Field Components
// ============================================================================

type OrgFormName = keyof OrganizationSetupFormData;

interface TextFieldProps {
  name: OrgFormName;
  label: React.ReactNode;
  placeholder: string;
  disabled?: boolean;
  autoComplete?: string;
  icon?: React.ReactNode;
}

const TextField = ({
  name,
  label,
  placeholder,
  disabled,
  autoComplete,
  icon,
}: TextFieldProps): React.JSX.Element => (
  <FormField<OrganizationSetupFormData, OrgFormName>
    name={name}
    render={({ field, fieldState }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        {icon ? (
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              {icon}
            </div>
            <FormControl>
              <Input
                type="text"
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                hasError={!!fieldState.error}
                className="pl-10"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
          </div>
        ) : (
          <FormControl>
            <Input
              type="text"
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
              hasError={!!fieldState.error}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
        )}
        <FormMessage />
      </FormItem>
    )}
  />
);

interface TextAreaFieldProps {
  name: OrgFormName;
  label: string;
  placeholder: string;
  disabled?: boolean;
  rows?: number;
}

const TextAreaField = ({
  name,
  label,
  placeholder,
  disabled,
  rows = 4,
}: TextAreaFieldProps): React.JSX.Element => {
  const t = useT();

  return (
    <FormField<OrganizationSetupFormData, OrgFormName>
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>
            {label}{" "}
            <span className="font-normal text-ink-50">
              {t("public.profile.settings.optional")}
            </span>
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              className={
                fieldState.error
                  ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/22"
                  : undefined
              }
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// ============================================================================
// Form Component
// ============================================================================

interface OrganizationFormProps {
  onSubmit: (data: OrganizationSetupFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

function OrganizationForm({
  onSubmit,
  isSubmitting,
  error,
}: OrganizationFormProps): React.JSX.Element {
  const t = useT();
  const form = useForm<OrganizationSetupFormData>({
    resolver: zodResolver(buildOrganizationSetupSchema(t)),
    defaultValues: {
      organizationName: "",
      inn: "",
      legalAddress: "",
      description: "",
      website: "",
      phone: "",
    },
  });
  const { handleSubmit } = form;

  const required = <span className="text-[var(--danger)]">*</span>;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-5"
      >
        <TextField
          name="organizationName"
          label={
            <>
              {t("public.profile.settings.fields.organizationName")} {required}
            </>
          }
          placeholder="EventFlow Inc."
          disabled={isSubmitting}
          autoComplete="organization"
          icon={
            <Building2
              className="h-5 w-5 text-ink-50"
              aria-hidden="true"
              strokeWidth={2}
            />
          }
        />

        <TextField
          name="inn"
          label={<>{t("public.auth.organizationSetup.inn")} {required}</>}
          placeholder="123456789"
          disabled={isSubmitting}
        />

        <TextField
          name="legalAddress"
          label={
            <>
              {t("public.auth.organizationSetup.legalAddress")} {required}
            </>
          }
          placeholder={t(
            "public.auth.organizationSetup.legalAddressPlaceholder"
          )}
          disabled={isSubmitting}
        />

        <TextAreaField
          name="description"
          label={t("public.profile.settings.fields.description")}
          placeholder={t(
            "public.auth.organizationSetup.descriptionPlaceholder"
          )}
          disabled={isSubmitting}
        />

        <TextField
          name="website"
          label={t("public.profile.settings.fields.website")}
          placeholder="https://example.com"
          disabled={isSubmitting}
          autoComplete="url"
        />

        <TextField
          name="phone"
          label={t("public.auth.organizationSetup.contactPhone")}
          placeholder="+998 90 123 45 67"
          disabled={isSubmitting}
          autoComplete="tel"
        />

        {error && <ErrorAlert message={error} />}

        <Button
          variant="primary"
          size="lg"
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-forest-500 hover:bg-forest-600 focus:ring-forest-200/60"
          rightIcon={
            isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            )
          }
        >
          {isSubmitting
            ? t("public.auth.organizationSetup.creating")
            : t("public.auth.organizationSetup.create")}
        </Button>

        <InfoNotice />
      </form>
    </Form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function OrganizationSetupPage(): React.JSX.Element {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);

  // Проверяем верификацию email при монтировании
  // eslint-disable-next-line no-restricted-syntax -- Необходимо для проверки безопасности (верификация email)
  useEffect(() => {
    const checkEmailVerification = async (): Promise<void> => {
      try {
        const user = await authService.getCurrentUser();

        // Проверяем, верифицирован ли email (только для User, у Organization нет этого поля)
        if ("isEmailVerified" in user && !user.isEmailVerified) {
          // Редирект на страницу верификации если email не подтверждён
          router.push(
            withLocalePath(
              `/verify-email?email=${encodeURIComponent(user.email)}&type=organizer`,
              locale
            )
          );
          return;
        }

        setIsCheckingVerification(false);
      } catch (err) {
        // Если не авторизован или ошибка, редирект на регистрацию
        console.error(
          t("public.auth.organizationSetup.verificationCheckError"),
          err
        );
        router.push(withLocalePath("/signup", locale));
      }
    };

    void checkEmailVerification();
  }, [locale, router, t]);

  const handleSubmit = async (
    data: OrganizationSetupFormData
  ): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Шаг 4B: PATCH /workspace/me - обновляем профиль организации
      await organizationsService.updateMe({
        organizationName: data.organizationName,
        description: data.description || undefined,
        website: data.website || undefined,
        phone: cleanPhoneNumber(data.phone),
        address: data.legalAddress,
      });

      // Шаг 5: POST /workspace/me/complete-onboarding - завершаем онбординг
      await organizationsService.completeOnboarding();

      // Шаг 6: Редирект на info-страницу с инструкциями
      router.push(withLocalePath("/organization-info", locale));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("public.auth.organizationSetup.createError")
      );
      setIsSubmitting(false);
    }
  };

  // Показываем загрузку пока проверяем верификацию
  if (isCheckingVerification) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="border border-[var(--border-1)] bg-white shadow-sm relative w-full max-w-2xl rounded-xl p-8 shadow-[0_24px_64px_rgba(15,23,42,0.15)] sm:p-10">
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-forest-500" />
            <p className="text-base text-ink-100">
              {t("public.auth.organizationSetup.checkingVerification")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className=" pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 opacity-40" />
      <div className=" pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 opacity-30" />

      <MotionFadeIn
        direction="none"
        className="border border-[var(--border-1)] bg-white shadow-sm relative w-full max-w-2xl rounded-xl p-8 shadow-[0_24px_64px_rgba(15,23,42,0.15)] sm:p-10"
      >
        <div className=" rounded-xl" />
        <div className="relative z-10">
          <PageHeader />
          <OrganizationForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            error={error}
          />
        </div>
      </MotionFadeIn>
    </div>
  );
}

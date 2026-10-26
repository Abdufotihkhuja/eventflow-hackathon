"use client";

/**
 * Страница завершения профиля для новых пользователей после OAuth
 * Показывается после выбора роли "user"
 */

import { useState } from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useT } from "@eventflow/i18n/react";
import { ArrowRight, Loader2, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authService, usersService } from "@shared/api";
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

// ============================================================================
// Schema
// ============================================================================

function createCompleteProfileSchema(t: ReturnType<typeof useT>) {
  return z.object({
  firstName: z
    .string()
    .min(2, t("public.auth.completeProfile.validation.firstNameMin"))
    .max(50, t("public.auth.completeProfile.validation.firstNameMax")),
  lastName: z
    .string()
    .min(2, t("public.auth.completeProfile.validation.lastNameMin"))
    .max(50, t("public.auth.completeProfile.validation.lastNameMax")),
  phone: z
    .string()
    .min(10, t("public.auth.completeProfile.validation.phone"))
    .optional()
    .or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  });
}

type CompleteProfileFormData = z.infer<
  ReturnType<typeof createCompleteProfileSchema>
>;

// ============================================================================
// Components
// ============================================================================

const PageHeader = ({
  t,
}: {
  t: ReturnType<typeof useT>;
}): React.JSX.Element => (
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
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-ember-50/80 px-4 py-1.5 text-sm font-medium text-ember-600">
        {t("public.auth.completeProfile.badge")}
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-ink-400">
        {t("public.auth.completeProfile.title")}
      </h1>
      <p className="mt-2 text-base text-ink-100">
        {t("public.auth.completeProfile.description")}
      </p>
    </div>
  </>
);

// ============================================================================
// Main Component
// ============================================================================

export default function CompleteProfilePage(): React.JSX.Element {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(createCompleteProfileSchema(t)),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      location: "",
    },
  });
  const { handleSubmit } = form;

  const onSubmit = async (data: CompleteProfileFormData): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Очищаем телефон от спецсимволов (оставляем только цифры и +)
      const cleanPhone = data.phone
        ? data.phone.replace(/[^\d+]/g, "")
        : undefined;

      // Шаг 4A: PATCH /account/me - обновляем профиль пользователя
      await authService.updateMyProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: cleanPhone,
        location: data.location || undefined,
      });

      // Шаг 5: POST /account/me/complete-onboarding - завершаем онбординг
      await usersService.completeOnboarding();

      // Шаг 6: Редирект на Dashboard
      router.push(withLocalePath("/profile", locale));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("public.auth.completeProfile.updateError")
      );
      setIsSubmitting(false);
    }
  };

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
          <PageHeader t={t} />

          <Form {...form}>
            <form
              onSubmit={(e) => void handleSubmit(onSubmit)(e)}
              className="space-y-5"
            >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField<CompleteProfileFormData, "firstName">
                name="firstName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      {t("public.auth.firstName")}{" "}
                      <span className="text-[var(--danger)]">*</span>
                    </FormLabel>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
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
                          disabled={isSubmitting}
                          hasError={!!fieldState.error}
                          className="pl-10"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField<CompleteProfileFormData, "lastName">
                name="lastName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      {t("public.auth.lastName")}{" "}
                      <span className="text-[var(--danger)]">*</span>
                    </FormLabel>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
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
                          disabled={isSubmitting}
                          hasError={!!fieldState.error}
                          className="pl-10"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField<CompleteProfileFormData, "phone">
              name="phone"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    {t("public.auth.completeProfile.phone")}{" "}
                    <span className="font-normal text-ink-50">
                      ({t("common.optional")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      autoComplete="tel"
                      disabled={isSubmitting}
                      hasError={!!fieldState.error}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<CompleteProfileFormData, "location">
              name="location"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    {t("public.auth.completeProfile.city")}{" "}
                    <span className="font-normal text-ink-50">
                      ({t("common.optional")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t(
                        "public.auth.completeProfile.cityPlaceholder"
                      )}
                      autoComplete="address-level2"
                      disabled={isSubmitting}
                      hasError={!!fieldState.error}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
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
                  <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              rightIcon={
                isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5" strokeWidth={2} />
                )
              }
            >
              {isSubmitting
                ? t("public.auth.completeProfile.saving")
                : t("public.auth.completeProfile.submit")}
            </Button>

            <p className="text-center text-sm text-ink-100">
              {t("public.auth.completeProfile.settingsHint")}
            </p>
            </form>
          </Form>
        </div>
      </MotionFadeIn>
    </div>
  );
}

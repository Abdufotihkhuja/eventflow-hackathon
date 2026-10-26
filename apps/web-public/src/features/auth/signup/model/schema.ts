import { z } from "zod";

import { PASSWORD_SPECIAL_CHARS_REGEX } from "./password-rules";

import type { Translator } from "@eventflow/i18n";
import type { AccountType } from "@shared/api/authService";

// ============================================================================
// Константы
// ============================================================================

export const ACCOUNT_TYPES = {
  user: {
    value: "user" as const,
    labelKey: "public.auth.userAccount",
    descriptionKey: "public.auth.userAccountDescription",
  },
  organizer: {
    value: "organizer" as const,
    labelKey: "public.auth.organizerAccount",
    descriptionKey: "public.auth.organizerAccountDescription",
  },
} as const;

// ============================================================================
// Базовые схемы
// ============================================================================

const createPasswordSchema = (t: Translator) =>
  z
    .string()
    .min(8, t("public.auth.validation.passwordMin"))
    .regex(/[a-z]/, t("public.auth.validation.passwordLowercase"))
    .regex(/[A-Z]/, t("public.auth.validation.passwordUppercase"))
    .regex(/[0-9]/, t("public.auth.validation.passwordNumber"))
    .regex(
      PASSWORD_SPECIAL_CHARS_REGEX,
      t("public.auth.validation.passwordSpecial")
    );

const createEmailSchema = (t: Translator) =>
  z
    .string()
    .min(1, t("public.auth.validation.emailRequired"))
    .email(t("public.auth.validation.invalidEmail"));

// ============================================================================
// Схема для пользователя
// ============================================================================

export const createUserSignupSchema = (t: Translator) =>
  z
    .object({
      accountType: z.literal("user"),
      firstName: z
        .string()
        .min(2, t("public.auth.validation.firstNameMin"))
        .max(50, t("public.auth.validation.firstNameMax"))
        .regex(
          /^[а-яА-ЯёЁa-zA-Z\s-]+$/,
          t("public.auth.validation.firstNamePattern")
        ),
      lastName: z
        .string()
        .min(2, t("public.auth.validation.lastNameMin"))
        .max(50, t("public.auth.validation.lastNameMax"))
        .regex(
          /^[а-яА-ЯёЁa-zA-Z\s-]+$/,
          t("public.auth.validation.lastNamePattern")
        ),
      email: createEmailSchema(t),
      password: createPasswordSchema(t),
      passwordConfirm: z
        .string()
        .min(1, t("public.auth.validation.confirmPassword")),
      acceptTerms: z
        .boolean()
        .refine((val) => val === true, t("public.auth.validation.acceptTerms")),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("validation.passwordsDoNotMatch"),
      path: ["passwordConfirm"],
    });

// ============================================================================
// Схема для организатора
// ============================================================================

export const createOrganizerSignupSchema = (t: Translator) =>
  z
    .object({
      accountType: z.literal("organizer"),
      organizationName: z
        .string()
        .min(2, t("public.auth.validation.organizationNameMin"))
        .max(100, t("public.auth.validation.organizationNameMax")),
      email: createEmailSchema(t),
      password: createPasswordSchema(t),
      passwordConfirm: z
        .string()
        .min(1, t("public.auth.validation.confirmPassword")),
      description: z
        .string()
        .max(500, t("public.auth.validation.organizationDescriptionMax"))
        .optional(),
      acceptTerms: z
        .boolean()
        .refine((val) => val === true, t("public.auth.validation.acceptTerms")),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("validation.passwordsDoNotMatch"),
      path: ["passwordConfirm"],
    });

// ============================================================================
// Общая схема регистрации (discriminated union)
// ============================================================================

export const userSignupSchema = createUserSignupSchema((key) => key);
export const organizerSignupSchema = createOrganizerSignupSchema((key) => key);
export const signupSchema = z.union([userSignupSchema, organizerSignupSchema]);

// ============================================================================
// Типы
// ============================================================================

export type UserSignupFormData = z.infer<
  ReturnType<typeof createUserSignupSchema>
>;
export type OrganizerSignupFormData = z.infer<
  ReturnType<typeof createOrganizerSignupSchema>
>;
export type SignupFormData = z.infer<typeof signupSchema>;

/**
 * Тип для выбора аккаунта (используется в UI до заполнения формы)
 */
export type AccountTypeSelection = AccountType | null;

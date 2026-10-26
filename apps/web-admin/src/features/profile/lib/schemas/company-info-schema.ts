import { z } from "zod";

/**
 * Схема формы Company Information (доп. поля организатора).
 * Соответствует PATCH /api/v1/workspace/me и доке ORGANIZATION_COMPANY_INFO_API.
 * Все поля необязательны — организатор может закрыть popup и заполнить позже.
 */
export const companyInfoSchema = z.object({
  industry: z
    .string()
    .max(100, "Не более 100 символов")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Укажите корректный URL")
    .optional()
    .or(z.literal("")),
  companySize: z
    .string()
    .regex(/^\d*$/, "Только цифры")
    .optional()
    .or(z.literal("")),
});

export type CompanyInfoFormValues = z.infer<typeof companyInfoSchema>;

/**
 * @module features/profile/edit/model/schema
 * @description Схема валидации для формы редактирования профиля
 */

import { z } from "zod";

/**
 * Схема валидации для focus area
 */
export const focusAreaSchema = z.object({
  label: z.string().min(2, "Минимум 2 символа").max(50, "Максимум 50 символов"),
  description: z
    .string()
    .min(10, "Минимум 10 символов")
    .max(200, "Максимум 200 символов"),
});

/**
 * Схема валидации формы редактирования профиля
 */
export const updateProfileSchema = z.object({
  // Основная информация
  name: z
    .string()
    .min(2, "Имя должно содержать минимум 2 символа")
    .max(100, "Имя не должно превышать 100 символов"),

  role: z
    .string()
    .min(2, "Должность должна содержать минимум 2 символа")
    .max(100, "Должность не должна превышать 100 символов"),

  company: z
    .string()
    .min(2, "Название компании должно содержать минимум 2 символа")
    .max(100, "Название компании не должно превышать 100 символов"),

  location: z
    .string()
    .min(2, "Локация должна содержать минимум 2 символа")
    .max(100, "Локация не должна превышать 100 символов"),

  timezone: z
    .string()
    .min(2, "Часовой пояс должен содержать минимум 2 символа")
    .max(20, "Часовой пояс не должен превышать 20 символов"),

  // Контактная информация
  email: z
    .string()
    .email("Некорректный email адрес")
    .min(5, "Email должен содержать минимум 5 символов")
    .max(100, "Email не должен превышать 100 символов"),

  telegram: z
    .string()
    .regex(
      /^@[\w]{5,32}$/,
      "Telegram username должен начинаться с @ и содержать от 5 до 32 символов"
    )
    .optional()
    .or(z.literal("")),

  // Профильная информация
  heroTitle: z
    .string()
    .min(10, "Заголовок должен содержать минимум 10 символов")
    .max(150, "Заголовок не должен превышать 150 символов"),

  heroSubtitle: z
    .string()
    .min(20, "Подзаголовок должен содержать минимум 20 символов")
    .max(300, "Подзаголовок не должен превышать 300 символов"),

  bio: z
    .string()
    .min(50, "Биография должна содержать минимум 50 символов")
    .max(1000, "Биография не должна превышать 1000 символов"),

  // Области фокуса (опционально, минимум 0, максимум 5)
  focusAreas: z
    .array(focusAreaSchema)
    .min(0, "Минимум 0 областей фокуса")
    .max(5, "Максимум 5 областей фокуса")
    .optional(),

  // Аватар (опционально, будет отдельная функция загрузки)
  avatarUrl: z.string().url("Некорректный URL аватара").optional(),
});

/**
 * Тип данных формы редактирования профиля
 */
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

/**
 * Значения по умолчанию для формы
 */
export const defaultProfileValues: Partial<UpdateProfileFormData> = {
  name: "",
  role: "",
  company: "",
  location: "",
  timezone: "GMT+3",
  email: "",
  telegram: "",
  heroTitle: "",
  heroSubtitle: "",
  bio: "",
  focusAreas: [],
};

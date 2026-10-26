/**
 * @module features/profile/complete-profile-info/model/schema
 * @description Схема валидации формы доп. полей профиля (popup «Заполните доп. поля»)
 * Согласовано с docs/USER_PROFILE_INFO_API.md и PATCH /api/v1/account/me
 */

import { z } from "zod";

export const completeProfileInfoSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  dateOfBirth: z.string().optional(),
  region: z.string().max(200).optional(),
  languages: z.array(z.string()).max(20).optional(),
  profileStatus: z.enum(["WORKER", "SCHOOLBOY", "STUDENT"]).optional(),
  workOrStudyPlace: z.string().max(300).optional(),
  skills: z
    .array(z.string())
    .max(3, "Можно выбрать не более 3 навыков")
    .optional(),
  specialization: z
    .enum([
      "LAWYER",
      "PROGRAMMER",
      "DESIGNER",
      "PHOTOGRAPHER",
      "PROJECT_MANAGER",
      "PRODUCT_MANAGER",
    ])
    .optional(),
  shortBio: z.string().max(150, "Максимум 150 символов").optional(),
});

export type CompleteProfileInfoFormData = z.infer<
  typeof completeProfileInfoSchema
>;

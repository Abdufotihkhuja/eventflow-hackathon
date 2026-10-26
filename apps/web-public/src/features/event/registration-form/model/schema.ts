/**
 * Валидация ответов формы регистрации (вопросы/тест).
 * Схема строится по списку вопросов: для required — строка не пустая.
 */

import { z } from "zod";

import type { RegistrationQuestionPublic } from "@shared/api/publicCatalogService";

/**
 * Строит zod-схему для формы ответов по списку вопросов.
 * Ключи — questionId, значения — строка (для required — min(1)).
 * Все поля на выходе — string (для необязательных default "").
 */
export function buildRegistrationAnswersSchema(
  questions: RegistrationQuestionPublic[]
): z.ZodType<RegistrationAnswersFormData> {
  const shape = Object.fromEntries(
    questions.map((q) => [
      q.id,
      q.required
        ? z.string().min(1, "Обязательное поле")
        : z.string().default(""),
    ])
  );
  return z.object(shape) as z.ZodType<RegistrationAnswersFormData>;
}

export type RegistrationAnswersFormData = Record<string, string>;

/**
 * Преобразует данные формы в массив ответов для API.
 */
export function formDataToAnswers(
  data: RegistrationAnswersFormData,
  questionIds: string[]
): Array<{ questionId: string; answer: string }> {
  return questionIds.map((questionId) => ({
    questionId,
    answer: (data[questionId] ?? "").trim(),
  }));
}

/**
 * Хук для получения публичных вопросов регистрации на событие
 * GET /api/v1/events/:eventId/questions/public
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useLocale } from "@eventflow/i18n/react";

import {
  publicCatalogService,
  PUBLIC_CATALOG_QUERY_KEYS,
  type RegistrationQuestionPublic,
} from "@shared/api/publicCatalogService";

interface UseRegistrationQuestionsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Загружает список вопросов регистрации для события (форма вопросов или тест).
 * Использует useLocale() — backend локализует question / options /
 * informationalText для UI-локали посетителя.
 * При пустом массиве — событие без вопросов, только кнопка регистрации.
 */
export const useRegistrationQuestionsQuery = (
  eventId: string,
  options?: UseRegistrationQuestionsQueryOptions
): UseQueryResult<RegistrationQuestionPublic[], Error> => {
  const uiLocale = useLocale();
  const localeParam =
    uiLocale === "ru" || uiLocale === "uz" || uiLocale === "en"
      ? uiLocale
      : undefined;
  return useQuery<RegistrationQuestionPublic[], Error>({
    queryKey: [
      ...PUBLIC_CATALOG_QUERY_KEYS.registrationQuestions(eventId),
      localeParam ?? "default",
    ] as const,
    queryFn: () =>
      publicCatalogService.getRegistrationQuestionsPublic(eventId, localeParam),
    enabled: options?.enabled ?? !!eventId,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
  });
};

"use client";

import { useEffect, useRef } from "react";

import { useI18n } from "@eventflow/i18n/react";

import { queryClient } from "@shared/lib/queryClient";

/**
 * Сбрасывает react-query кеш при смене локали, чтобы динамические данные с
 * бэкенда перезапросились в новом языке. Без инвалидации UI продолжает
 * показывать ответы предыдущей локали (локаль уезжает на бэк через
 * `?locale=` query-параметр, но кеш сам не знает, что данные устарели).
 *
 * Инкапсулирует useEffect в кастомный хук — соответствует ESLint-правилу
 * `no-restricted-syntax` проекта.
 */
export function useResetQueriesOnLocaleChange(): void {
  const { locale } = useI18n();
  const previousLocale = useRef<string>(locale);

  // eslint-disable-next-line no-restricted-syntax -- инкапсулировано в кастомный хук, эффект на смену локали
  useEffect(() => {
    if (previousLocale.current !== locale) {
      void queryClient.invalidateQueries();
      previousLocale.current = locale;
    }
  }, [locale]);
}

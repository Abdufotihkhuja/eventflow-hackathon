"use client";

import { type ReactNode } from "react";

import { I18nProvider } from "@eventflow/i18n/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { useResetQueriesOnLocaleChange } from "@shared/lib/hooks/useResetQueriesOnLocaleChange";
import { queryClient } from "@shared/lib/queryClient";

export interface ProvidersProps {
  children: ReactNode;
  initialLocale: string;
}

/**
 * Сбрасывает react-query кеш при смене локали, чтобы динамические данные с
 * бэкенда перезапросились с новым `Accept-Language`. Без этого UI продолжает
 * показывать ответы предыдущего языка.
 */
function LocaleQueryInvalidator(): null {
  useResetQueriesOnLocaleChange();
  return null;
}

/**
 * Глобальный провайдер для всех контекстов приложения
 * - QueryClientProvider: управление серверным состоянием через TanStack Query
 * - ReactQueryDevtools: инструменты разработки для отладки Query
 */
export function Providers({
  children,
  initialLocale,
}: ProvidersProps): React.ReactNode {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <QueryClientProvider client={queryClient}>
        <LocaleQueryInvalidator />
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </I18nProvider>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fallbackLocale, normalizeLocale, type Locale } from "../config.js";
import { messagesByLocale } from "../locales.js";
import { createTranslator, type MessageCatalog } from "../translate.js";
import { getInitialLocale, persistLocale, syncDocumentLocale } from "../storage.js";
import type { Translator } from "../types.js";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale | string) => void;
  t: Translator;
}

export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale | string | null;
  messages?: MessageCatalog;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
  messages = messagesByLocale,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    () => normalizeLocale(initialLocale) ?? getInitialLocale(),
  );

  const setLocale = useCallback((nextLocale: Locale | string) => {
    const normalizedLocale = normalizeLocale(nextLocale) ?? fallbackLocale;
    setLocaleState(normalizedLocale);
    persistLocale(normalizedLocale);
  }, []);

  useEffect(() => {
    syncDocumentLocale(locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: createTranslator(locale, messages),
    }),
    [locale, messages, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}

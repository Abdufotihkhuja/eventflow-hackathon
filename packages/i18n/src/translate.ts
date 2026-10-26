import { fallbackLocale, normalizeLocale, type Locale } from "./config.js";
import { interpolate } from "./interpolation.js";
import { messagesByLocale } from "./locales.js";
import type { LocaleMessages, TranslationParams, Translator } from "./types.js";

export type MessageCatalog = Partial<Record<Locale, LocaleMessages>> & {
  en: LocaleMessages;
};

export interface TranslatorOptions {
  missingMessage?: string;
}

function getMessageValue(messages: unknown, key: string): string | null {
  const segments = key.split(".");
  let current: unknown = messages;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : null;
}

function isDevelopmentRuntime(): boolean {
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV;
  return nodeEnv !== "production";
}

function humanizeMissingKey(key: string): string {
  const lastSegment = key.split(".").at(-1) ?? "";
  const spaced = lastSegment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!spaced) {
    return "";
  }

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function createTranslator(
  locale: Locale | string | null | undefined,
  messages: MessageCatalog = messagesByLocale,
  options?: TranslatorOptions,
): Translator {
  const normalizedLocale = normalizeLocale(locale) ?? fallbackLocale;

  return (key, params) => {
    const localeMessages = messages[normalizedLocale] ?? messages[fallbackLocale];
    const message =
      getMessageValue(localeMessages, key) ??
      getMessageValue(messages[fallbackLocale], key) ??
      null;

    if (message) {
      return interpolate(message, params);
    }

    if (options?.missingMessage) {
      return interpolate(options.missingMessage, { key, ...params });
    }

    return isDevelopmentRuntime() ? `[missing translation: ${key}]` : humanizeMissingKey(key);
  };
}

export const t = createTranslator(fallbackLocale);

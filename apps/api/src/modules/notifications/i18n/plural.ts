/**
 * Плюрализация счётчиков пушей (BL-11) — зеркало
 * `packages/i18n/src/plural.ts` (тот же контракт PluralForms/`#`-подстановки,
 * те же CLDR-правила через Intl.PluralRules).
 *
 * Почему зеркало, а не импорт: `@eventflow/i18n` — ESM-пакет
 * (`"type": "module"`), apps/api — CommonJS; require(esm) не гарантирован на
 * нижней границе engines (node 20 < 20.19) и не работает под jest-runtime.
 * При переезде словаря в packages/i18n (BL-53) файл удаляется, вызовы
 * переключаются на оригинал без правок сигнатур.
 */

export type PushLocale = 'ru' | 'uz' | 'en';

export const PUSH_LOCALES: readonly PushLocale[] = ['ru', 'uz', 'en'];

export const DEFAULT_PUSH_LOCALE: PushLocale = 'ru';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type PluralForms = Partial<Record<PluralCategory, string>> & {
  other: string;
};

/** ru обязан нести one/few/many (счётчики регистраций/мест — легенда каталога). */
export type LocalizedPluralForms = Record<PushLocale, PluralForms>;

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: PushLocale): Intl.PluralRules {
  // uz в CLDR имеет только one/other; ru — one/few/many/other.
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

/** 'ru-RU' → 'ru'; всё незнакомое → 'ru' (приоритет локали DATA_MODEL_DELTA §6). */
export function normalizePushLocale(
  locale: string | null | undefined,
): PushLocale {
  const lower = (locale ?? '').toLowerCase();
  for (const known of PUSH_LOCALES) {
    if (lower === known || lower.startsWith(`${known}-`)) {
      return known;
    }
  }
  return DEFAULT_PUSH_LOCALE;
}

/**
 * Выбор формы для `count` по CLDR-правилам локали; `#` в форме заменяется
 * числом. Сигнатура совместима с `plural()` из packages/i18n.
 */
export function plural(
  locale: PushLocale | string | null | undefined,
  count: number,
  forms: LocalizedPluralForms,
): string {
  const normalized = normalizePushLocale(
    typeof locale === 'string' ? locale : null,
  );
  const localeForms = forms[normalized] ?? forms.en;
  const category = getPluralRules(normalized).select(count) as PluralCategory;
  const form = localeForms[category] ?? localeForms.other;
  return form.replace(/#/g, String(count));
}

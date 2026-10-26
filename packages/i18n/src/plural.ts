import { fallbackLocale, normalizeLocale, type Locale } from "./config.js";
import { toIntlLocale } from "./format.js";

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

export type PluralForms = Partial<Record<PluralCategory, string>> & { other: string };

export type LocalizedPluralForms = Partial<Record<Locale, PluralForms>> & {
  en: PluralForms;
};

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: Locale): Intl.PluralRules {
  const intlLocale = toIntlLocale(locale);
  let rules = pluralRulesCache.get(intlLocale);

  if (!rules) {
    rules = new Intl.PluralRules(intlLocale);
    pluralRulesCache.set(intlLocale, rules);
  }

  return rules;
}

/**
 * Selects the correct plural form for `count` in `locale` using CLDR rules
 * (`Intl.PluralRules`), so Russian's one/few/many forms render correctly
 * instead of a single hardcoded form. `#` in the chosen form is replaced
 * with the count.
 *
 * @example
 * plural(locale, n, {
 *   en: { one: "# event", other: "# events" },
 *   ru: { one: "# событие", few: "# события", many: "# событий", other: "# события" },
 *   uz: { other: "# ta tadbir" },
 * });
 */
export function plural(
  locale: Locale | string | null | undefined,
  count: number,
  forms: LocalizedPluralForms,
): string {
  const normalized = normalizeLocale(locale) ?? fallbackLocale;
  const localeForms = forms[normalized] ?? forms.en;
  const category = getPluralRules(normalized).select(count) as PluralCategory;
  const form = localeForms[category] ?? localeForms.other;

  return form.replace(/#/g, String(count));
}

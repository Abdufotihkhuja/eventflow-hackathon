import { type Locale } from "./config.js";
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";
export type PluralForms = Partial<Record<PluralCategory, string>> & {
    other: string;
};
export type LocalizedPluralForms = Partial<Record<Locale, PluralForms>> & {
    en: PluralForms;
};
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
export declare function plural(locale: Locale | string | null | undefined, count: number, forms: LocalizedPluralForms): string;
//# sourceMappingURL=plural.d.ts.map
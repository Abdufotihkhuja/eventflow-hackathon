import { fallbackLocale, normalizeLocale } from "./config.js";
import { toIntlLocale } from "./format.js";
const pluralRulesCache = new Map();
function getPluralRules(locale) {
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
export function plural(locale, count, forms) {
    const normalized = normalizeLocale(locale) ?? fallbackLocale;
    const localeForms = forms[normalized] ?? forms.en;
    const category = getPluralRules(normalized).select(count);
    const form = localeForms[category] ?? localeForms.other;
    return form.replace(/#/g, String(count));
}
//# sourceMappingURL=plural.js.map
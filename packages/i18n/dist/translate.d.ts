import { type Locale } from "./config.js";
import type { LocaleMessages, Translator } from "./types.js";
export type MessageCatalog = Partial<Record<Locale, LocaleMessages>> & {
    en: LocaleMessages;
};
export interface TranslatorOptions {
    missingMessage?: string;
}
export declare function createTranslator(locale: Locale | string | null | undefined, messages?: MessageCatalog, options?: TranslatorOptions): Translator;
export declare const t: Translator;
//# sourceMappingURL=translate.d.ts.map
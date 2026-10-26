import type { TranslationKey, Translator } from "./types.js";
export type LabelKey = TranslationKey | string;
export type LabelKeyMap<Value extends PropertyKey> = Partial<Record<Value, LabelKey>>;
export type TranslatableOption<Value = string> = {
    readonly value: Value;
    readonly labelKey: LabelKey;
    readonly disabled?: boolean;
};
export declare function createLabelGetter<Value extends PropertyKey>(labelKeyMap: LabelKeyMap<Value>, t: Translator, options?: {
    fallbackLabel?: string;
}): (value: Value) => string;
export declare function translateOptions<Option extends TranslatableOption>(options: readonly Option[], t: Translator): Array<Omit<Option, "labelKey"> & {
    label: string;
}>;
//# sourceMappingURL=static-data.d.ts.map
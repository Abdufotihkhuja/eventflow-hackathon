import type { messages as enMessages } from "./messages/en/index.js";
export type PrimitiveTranslationValue = string | number | boolean | Date | null | undefined;
export type TranslationParams = Record<string, PrimitiveTranslationValue>;
export type MessageLeaf = string;
export type MessageTree = {
    readonly [key: string]: MessageLeaf | MessageTree;
};
type WidenMessageValues<T> = T extends string ? string : T extends Record<string, unknown> ? {
    readonly [Key in keyof T]: WidenMessageValues<T[Key]>;
} : never;
export type LocaleMessages = WidenMessageValues<typeof enMessages>;
type JoinKey<Prefix extends string, Key extends string> = Prefix extends "" ? Key : `${Prefix}.${Key}`;
export type DotNestedKeys<T, Prefix extends string = ""> = {
    [Key in keyof T & string]: T[Key] extends string ? JoinKey<Prefix, Key> : T[Key] extends Record<string, unknown> ? DotNestedKeys<T[Key], JoinKey<Prefix, Key>> : never;
}[keyof T & string];
export type TranslationKey = DotNestedKeys<LocaleMessages>;
export type Translator = (key: TranslationKey | string, params?: TranslationParams) => string;
export {};
//# sourceMappingURL=types.d.ts.map
import { localeCookieName, type Locale } from "../config.js";
export type CookieValue = {
    value?: string;
} | string | null | undefined;
export type CookieReader = {
    get(name: string): CookieValue;
};
export interface LocaleCookieOptions {
    name: typeof localeCookieName;
    value: Locale;
    path: "/";
    maxAge: number;
    sameSite: "lax";
}
export declare function getLocaleFromCookieReader(cookies: CookieReader | null | undefined): Locale;
export declare function getLocaleFromCookieHeader(cookieHeader: string | null | undefined): Locale;
export declare function getLocaleCookieOptions(locale: Locale | string): LocaleCookieOptions;
export declare function createLocaleSetCookieHeader(locale: Locale | string): string;
//# sourceMappingURL=cookies.d.ts.map
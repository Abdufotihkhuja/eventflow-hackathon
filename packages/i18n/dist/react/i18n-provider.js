"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { fallbackLocale, normalizeLocale } from "../config.js";
import { messagesByLocale } from "../locales.js";
import { createTranslator } from "../translate.js";
import { getInitialLocale, persistLocale, syncDocumentLocale } from "../storage.js";
const I18nContext = createContext(null);
export function I18nProvider({ children, initialLocale, messages = messagesByLocale, }) {
    const [locale, setLocaleState] = useState(() => normalizeLocale(initialLocale) ?? getInitialLocale());
    const setLocale = useCallback((nextLocale) => {
        const normalizedLocale = normalizeLocale(nextLocale) ?? fallbackLocale;
        setLocaleState(normalizedLocale);
        persistLocale(normalizedLocale);
    }, []);
    useEffect(() => {
        syncDocumentLocale(locale);
    }, [locale]);
    const value = useMemo(() => ({
        locale,
        setLocale,
        t: createTranslator(locale, messages),
    }), [locale, messages, setLocale]);
    return _jsx(I18nContext.Provider, { value: value, children: children });
}
export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used inside I18nProvider");
    }
    return context;
}
//# sourceMappingURL=i18n-provider.js.map
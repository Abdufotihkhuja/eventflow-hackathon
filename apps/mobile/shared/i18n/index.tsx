/**
 * i18n provider. Holds the active language (uz / ru / en), persists the choice,
 * and exposes:
 *   • `t(key, params?)`   — translate a UI string, filling `{placeholders}`
 *   • `tx(record)`        — localize an `L` data record (e.g. `event.title`)
 *   • `lang` / `setLang`  — current language + setter
 *
 * Default language comes from the device locale, falling back to Uzbek.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";

import { setDisplayScriptCyrillic } from "@shared/theme";

import type { L, Lang } from "@shared/data/events";

import { STRINGS, type StringKey } from "./strings";
import { PLURALS, pluralCategory, type PluralForms, type PluralKey } from "./plurals";

const KEY = "ef.lang";
const SUPPORTED: Lang[] = ["uz", "ru", "en"];
const NUM_LOCALE: Record<Lang, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "uz", label: "Oʻzbekcha" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

function deviceLang(): Lang {
  const code = Localization.getLocales()?.[0]?.languageCode as Lang | undefined;
  return code && SUPPORTED.includes(code) ? code : "uz";
}

async function loadLang(): Promise<Lang | null> {
  try {
    const v = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return v && SUPPORTED.includes(v as Lang) ? (v as Lang) : null;
  } catch {
    return null;
  }
}

/** Персистированный язык приложения для не-React модулей: регистрация
 *  устройства (BL-25) читает его, собирая meta для `PUT /me/devices`. */
export async function getPersistedLang(): Promise<Lang> {
  return (await loadLang()) ?? deviceLang();
}

function saveLang(lang: Lang): void {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, lang);
    else void SecureStore.setItemAsync(KEY, lang);
  } catch {
    /* best-effort persistence */
  }
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
  /** Count-aware translate: picks the CLDR plural form for `n` and formats {n}. */
  tn: (key: PluralKey, n: number, params?: Record<string, string | number>) => string;
  tx: (record: L) => string;
}

const I18nCtx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [lang, setLangState] = useState<Lang>(deviceLang);

  // Pick the display script synchronously so headlines use a Cyrillic-capable
  // face on the first render after a language change (no serif fallback flash).
  setDisplayScriptCyrillic(lang === "ru");

  useEffect(() => {
    void loadLang().then((v) => {
      if (v) setLangState(v);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      tx: (record: L) => record[lang] ?? record.en,
      t: (key, params) => {
        let s = STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key;
        // split/join = replace ALL occurrences (String.replace only hits the first).
        if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
        return s;
      },
      tn: (key, n, params) => {
        const forms = (PLURALS[key]?.[lang] ?? PLURALS[key]?.en) as PluralForms | undefined;
        const cat = pluralCategory(lang, n);
        let s = forms?.[cat] ?? forms?.other ?? forms?.many ?? forms?.one ?? String(n);
        s = s.split("{n}").join(new Intl.NumberFormat(NUM_LOCALE[lang]).format(n));
        if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
        return s;
      },
    }),
    [lang, setLang],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

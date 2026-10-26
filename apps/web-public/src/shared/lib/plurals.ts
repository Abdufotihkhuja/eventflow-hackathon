import type { LocalizedPluralForms } from "@eventflow/i18n";

/**
 * Shared CLDR plural form tables for public-facing count copy. Routed through
 * `plural()` from `@eventflow/i18n` so Russian one/few/many forms render
 * correctly (e.g. "1 событие", "2 события", "5 событий") instead of a single
 * hardcoded form. `#` is replaced with the count.
 */

export const EVENTS_PLURAL: LocalizedPluralForms = {
  en: { one: "# event", other: "# events" },
  ru: { one: "# событие", few: "# события", many: "# событий", other: "# событий" },
  uz: { other: "# ta tadbir" },
};

export const COLLECTIONS_PLURAL: LocalizedPluralForms = {
  en: { one: "# collection", other: "# collections" },
  ru: { one: "# подборка", few: "# подборки", many: "# подборок", other: "# подборок" },
  uz: { other: "# toʻplam" },
};

export const EVENTS_FOUND_PLURAL: LocalizedPluralForms = {
  en: { one: "# event found", other: "# events found" },
  ru: {
    one: "# событие найдено",
    few: "# события найдено",
    many: "# событий найдено",
    other: "# событий найдено",
  },
  uz: { other: "# ta tadbir topildi" },
};

/**
 * Abbreviated minutes. The full forms are nominative ("3 минуты") and read
 * wrong after prepositions that govern the genitive ("около 3 минут"), so
 * duration hints use the indeclinable short form instead.
 */
export const MINUTES_SHORT_PLURAL: LocalizedPluralForms = {
  en: { one: "# min", other: "# min" },
  ru: { other: "# мин" },
  uz: { other: "# daq" },
};

export const QUESTIONS_PLURAL: LocalizedPluralForms = {
  en: { one: "# question", other: "# questions" },
  ru: { one: "# вопрос", few: "# вопроса", many: "# вопросов", other: "# вопросов" },
  uz: { other: "# ta savol" },
};

export const TRIPS_PLURAL: LocalizedPluralForms = {
  en: { one: "# trip", other: "# trips" },
  ru: { one: "# поездка", few: "# поездки", many: "# поездок", other: "# поездок" },
  uz: { other: "# sayohat" },
};

export const DIRECTIONS_PLURAL: LocalizedPluralForms = {
  en: { one: "# direction", other: "# directions" },
  ru: {
    one: "# направление",
    few: "# направления",
    many: "# направлений",
    other: "# направлений",
  },
  uz: { other: "# yoʻnalish" },
};

/*
 * Pricing / quota copy (P-5). Used by the /pricing page for pack units
 * ("5 событий · 90 дней"), quotas ("200 генераций"), and caps
 * ("до 400 участников", "3 сотрудника") — kept here so the organizer landing
 * and cabinet copy can reuse the same tables at the M-14 flip.
 */

export const DAYS_PLURAL: LocalizedPluralForms = {
  en: { one: "# day", other: "# days" },
  ru: { one: "# день", few: "# дня", many: "# дней", other: "# дней" },
  uz: { other: "# kun" },
};

export const MINUTES_PLURAL: LocalizedPluralForms = {
  en: { one: "# minute", other: "# minutes" },
  ru: { one: "# минута", few: "# минуты", many: "# минут", other: "# минут" },
  uz: { other: "# daqiqa" },
};

export const GENERATIONS_PLURAL: LocalizedPluralForms = {
  en: { one: "# generation", other: "# generations" },
  ru: {
    one: "# генерация",
    few: "# генерации",
    many: "# генераций",
    other: "# генераций",
  },
  uz: { other: "# ta generatsiya" },
};

export const PARTICIPANTS_PLURAL: LocalizedPluralForms = {
  en: { one: "# participant", other: "# participants" },
  ru: {
    one: "# участник",
    few: "# участника",
    many: "# участников",
    other: "# участников",
  },
  uz: { other: "# nafar ishtirokchi" },
};

export const STAFF_PLURAL: LocalizedPluralForms = {
  en: { one: "# team seat", other: "# team seats" },
  ru: {
    one: "# сотрудник",
    few: "# сотрудника",
    many: "# сотрудников",
    other: "# сотрудников",
  },
  uz: { other: "# nafar xodim" },
};

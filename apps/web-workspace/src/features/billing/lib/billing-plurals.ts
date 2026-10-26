import type { LocalizedPluralForms } from '@eventflow/i18n'

/**
 * CLDR-таблицы множественного числа для счётных биллинг-значений (C-14).
 * Паттерн — apps/web-public/src/shared/lib/plurals.ts: `#` заменяется числом,
 * русские one/few/many рендерятся корректно («1 день», «2 дня», «5 дней»).
 */

export const DAYS_LEFT_PLURAL: LocalizedPluralForms = {
  en: { one: "# day left", other: "# days left" },
  ru: { one: "остался # день", few: "осталось # дня", many: "осталось # дней", other: "осталось # дней" },
  uz: { other: "# kun qoldi" },
}

export const DAYS_PLURAL: LocalizedPluralForms = {
  en: { one: "# day", other: "# days" },
  ru: { one: "# день", few: "# дня", many: "# дней", other: "# дней" },
  uz: { other: "# kun" },
}

export const EVENT_CREDITS_PLURAL: LocalizedPluralForms = {
  en: { one: "# event credit", other: "# event credits" },
  ru: {
    one: "# кредит на публикацию",
    few: "# кредита на публикацию",
    many: "# кредитов на публикацию",
    other: "# кредитов на публикацию",
  },
  uz: { other: "# ta e'lon krediti" },
}

export const EVENTS_PLURAL: LocalizedPluralForms = {
  en: { one: "# event", other: "# events" },
  ru: { one: "# событие", few: "# события", many: "# событий", other: "# событий" },
  uz: { other: "# ta tadbir" },
}

export const SEATS_PLURAL: LocalizedPluralForms = {
  en: { one: "# team seat", other: "# team seats" },
  ru: {
    one: "# место сотрудника",
    few: "# места сотрудников",
    many: "# мест сотрудников",
    other: "# мест сотрудников",
  },
  uz: { other: "# ta xodim o'rni" },
}

/** Родительный падеж после «из …» для счётчика мест: «из 1 места», «из 3 мест». */
export const SEATS_OF_PLURAL: LocalizedPluralForms = {
  en: { one: "# seat", other: "# seats" },
  ru: { one: "# места", few: "# мест", many: "# мест", other: "# мест" },
  uz: { other: "# ta o'rin" },
}

export const GENERATIONS_PLURAL: LocalizedPluralForms = {
  en: { one: "# generation", other: "# generations" },
  ru: { one: "# генерация", few: "# генерации", many: "# генераций", other: "# генераций" },
  uz: { other: "# ta generatsiya" },
}

export const AI_MINUTES_PLURAL: LocalizedPluralForms = {
  en: { one: "# AI minute", other: "# AI minutes" },
  ru: { one: "# AI-минута", few: "# AI-минуты", many: "# AI-минут", other: "# AI-минут" },
  uz: { other: "# daqiqa AI" },
}

export const PARTICIPANTS_PLURAL: LocalizedPluralForms = {
  en: { one: "up to # participant per event", other: "up to # participants per event" },
  ru: {
    one: "до # участника на событие",
    few: "до # участников на событие",
    many: "до # участников на событие",
    other: "до # участников на событие",
  },
  uz: { other: "har tadbirga # tagacha ishtirokchi" },
}

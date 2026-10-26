import type { LocalizedPluralForms } from '@eventflow/i18n'

/**
 * CLDR-таблицы форм для счётных значений биллинга. Прогоняются через
 * `plural()` из `@eventflow/i18n`, чтобы русские one/few/many рендерились
 * корректно («1 день», «2 дня», «5 дней»). `#` заменяется на число.
 * Паттерн — apps/web-public/src/shared/lib/plurals.ts.
 */

export const DAYS_PLURAL: LocalizedPluralForms = {
  en: { one: '# day', other: '# days' },
  ru: { one: '# день', few: '# дня', many: '# дней', other: '# дней' },
  uz: { other: '# kun' },
}

export const CREDITS_PLURAL: LocalizedPluralForms = {
  en: { one: '# credit', other: '# credits' },
  ru: { one: '# кредит', few: '# кредита', many: '# кредитов', other: '# кредитов' },
  uz: { other: '# ta kredit' },
}

export const REQUESTS_PLURAL: LocalizedPluralForms = {
  en: { one: '# request', other: '# requests' },
  ru: { one: '# заявка', few: '# заявки', many: '# заявок', other: '# заявок' },
  uz: { other: "# ta so'rov" },
}

export const ENTRIES_PLURAL: LocalizedPluralForms = {
  en: { one: '# entry', other: '# entries' },
  ru: { one: '# запись', few: '# записи', many: '# записей', other: '# записей' },
  uz: { other: '# ta yozuv' },
}

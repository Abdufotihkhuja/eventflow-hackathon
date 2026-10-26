/**
 * Count-aware strings (FND-13). Russian needs one/few/many agreement; Uzbek has
 * no count agreement (always one form); English is one/other. `tn(key, n)`
 * (i18n provider) picks the right form via CLDR rules and formats {n}.
 */
import type { Lang } from "@shared/data/events";

export type PluralCategory = "one" | "few" | "many" | "other";

/** CLDR plural category. uz → always "other"; en → one/other; ru → one/few/many. */
export function pluralCategory(lang: Lang, n: number): PluralCategory {
  const x = Math.abs(Math.trunc(n));
  if (lang === "uz") return "other";
  if (lang === "en") return x === 1 ? "one" : "other";
  // Russian
  const mod10 = x % 10;
  const mod100 = x % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
  return "many";
}

export type PluralForms = Partial<Record<PluralCategory, string>>;

export const PLURALS = {
  "detail.spotsLeft": {
    uz: { other: "{n} ta joy qoldi" },
    ru: { one: "{n} место осталось", few: "{n} места осталось", many: "{n} мест осталось" },
    en: { one: "{n} spot left", other: "{n} spots left" },
  },
  "detail.going": {
    uz: { other: "{n} boradi" },
    ru: { one: "{n} идёт", few: "{n} идут", many: "{n} идут" },
    en: { one: "{n} going", other: "{n} going" },
  },
  "detail.othersGoing": {
    uz: { other: "{n} kishi boradi" },
    ru: { one: "{n} участник идёт", few: "{n} участника идут", many: "{n} участников идут" },
    en: { one: "{n} going", other: "{n} going" },
  },
  "comments.replies": {
    uz: { other: "{n} ta javobni ko'rsatish" },
    ru: { one: "Показать {n} ответ", few: "Показать {n} ответа", many: "Показать {n} ответов" },
    en: { one: "Show {n} reply", other: "Show {n} replies" },
  },
  "home.subCount": {
    uz: { other: "{city} · {n} ta yaqin tadbir" },
    ru: { one: "{city} · {n} ближайшее событие", few: "{city} · {n} ближайших события", many: "{city} · {n} ближайших событий" },
    en: { one: "{city} · {n} event coming up", other: "{city} · {n} events coming up" },
  },
  "tickets.upcomingCount": {
    uz: { other: "{n} ta yaqin" },
    ru: { one: "{n} предстоящее", few: "{n} предстоящих", many: "{n} предстоящих" },
    en: { one: "{n} upcoming", other: "{n} upcoming" },
  },
  "tickets.pastCount": {
    uz: { other: "{n} ta o'tgan" },
    ru: { one: "{n} посещённое", few: "{n} посещённых", many: "{n} посещённых" },
    en: { one: "{n} attended", other: "{n} attended" },
  },
  // --- W2: search results count (append-only) ---
  "search.results": {
    uz: { other: "«{q}» boʻyicha {n} ta tadbir" },
    ru: { one: "{n} событие по запросу «{q}»", few: "{n} события по запросу «{q}»", many: "{n} событий по запросу «{q}»" },
    en: { one: "{n} event for “{q}”", other: "{n} events for “{q}”" },
  },
  // --- W4: certificates counts (append-only) ---
  "certs.earnedCount": {
    uz: { other: "{n} ta sertifikat" },
    ru: { one: "{n} сертификат", few: "{n} сертификата", many: "{n} сертификатов" },
    en: { one: "{n} certificate", other: "{n} certificates" },
  },
  "certs.hoursCount": {
    uz: { other: "{n} soat" },
    ru: { one: "{n} час", few: "{n} часа", many: "{n} часов" },
    en: { one: "{n} hour", other: "{n} hours" },
  },
  // --- Organization tab: team size under the "Team" row (append-only) ---
  "org.team.members": {
    uz: { other: "{n} ta aʼzo" },
    ru: { one: "{n} участник", few: "{n} участника", many: "{n} участников" },
    en: { one: "{n} member", other: "{n} members" },
  },
  // --- Organizer event card: capacity line when the event has no limit ---
  "org.events.registered": {
    uz: { other: "{n} ta roʻyxatdan oʻtgan" },
    ru: { one: "{n} зарегистрирован", few: "{n} зарегистрированы", many: "{n} зарегистрировано" },
    en: { one: "{n} registered", other: "{n} registered" },
  },
  // --- Discover subtitle while the feed shows other regions (append-only) ---
  "home.subCountElsewhere": {
    uz: { other: "{city} · hozircha yoʻq · boshqa hududlarda {n} ta" },
    ru: {
      one: "{city} · пока пусто · {n} в других регионах",
      few: "{city} · пока пусто · {n} в других регионах",
      many: "{city} · пока пусто · {n} в других регионах",
    },
    en: { one: "{city} · none yet · {n} elsewhere", other: "{city} · none yet · {n} elsewhere" },
  },
} satisfies Record<string, Record<Lang, PluralForms>>;

export type PluralKey = keyof typeof PLURALS;

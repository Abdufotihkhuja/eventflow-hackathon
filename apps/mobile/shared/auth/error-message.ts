/**
 * Auth-flow error copy.
 *
 * The API answers in Russian — "Неверный email или пароль", "Пароли не
 * совпадают", "Пароль должен содержать…" — not English. This helper used to
 * assume the opposite and pass `ApiError.message` straight through whenever the
 * app was running in English, so an English UI printed a Russian banner while
 * ru/uz users got the (correct) localized fallback. The condition is inverted
 * here: the server's own words are only shown to a reader of that language.
 */
import { ApiError } from "@shared/api";
import type { Lang } from "@shared/data/events";

export function authErrorText(e: unknown, lang: Lang, fallback: string): string {
  if (e instanceof ApiError && lang === "ru" && e.message) return e.message;
  return fallback;
}

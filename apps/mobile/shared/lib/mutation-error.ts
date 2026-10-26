/**
 * What to tell someone whose save just failed.
 *
 * Every organizer screen used to answer this with one line — "проверьте
 * соединение" — whatever actually happened. That is wrong in the two cases that
 * matter most: a 403 means the save will NEVER work for this member no matter
 * how many times they retry, and a 409 means the plan's limit is reached and
 * the fix is a purchase, not a tap. Both deserve their own words.
 *
 * The server answers in Russian. `authErrorText`'s rule applies here too: show
 * the server's own sentence only to a reader of that language, and fall back to
 * our copy otherwise — an English UI must not print a Russian banner.
 */
import { ApiError } from "@shared/api";

import type { Lang } from "@shared/data/events";
import type { StringKey } from "@shared/i18n/strings";

export interface MutationErrorText {
  /** Key of our own copy — always safe to show. */
  key: StringKey;
  /** The server's sentence, when it is in the reader's language. */
  detail?: string;
}

export function mutationErrorText(e: unknown, lang: Lang): MutationErrorText {
  // No ApiError means the request never reached the server. At a venue that is
  // almost always the network, and it is the one case where "try again" is
  // honest advice.
  if (!(e instanceof ApiError)) return { key: "error.offline" };

  const detail = lang === "ru" && e.message ? e.message : undefined;

  if (e.status === 401) return { key: "error.session" };
  if (e.status === 403) return { key: "error.forbidden", detail };
  if (e.status === 404) return { key: "error.gone", detail };
  if (e.status === 409) return { key: "error.conflict", detail };
  // 400/422 — the server explains exactly which field it refused, so its own
  // sentence is worth more than any generic line we could write.
  if (e.status >= 400 && e.status < 500) return { key: "error.rejected", detail };
  return { key: "error.server", detail };
}

/**
 * Native Uzbek (Latin) date formatting.
 *
 * `Intl.DateTimeFormat("uz-Latn-UZ", { month: "long" })` falls back to "M05"
 * style placeholders in many ICU/CLDR builds because the long month-name
 * data is incomplete. We render the strings ourselves so the schedule and
 * hero on /events/{slug} read like proper Uzbek text ("18-may", "Dush, 18-may")
 * instead of "M05 18".
 *
 * Month/weekday names follow the post-2019 Uzbek Latin orthography
 * (sentabr/oktabr without the soft sign).
 */

const UZ_MONTHS_LONG = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

const UZ_MONTHS_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
] as const;

const UZ_WEEKDAYS_LONG = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
] as const;

const UZ_WEEKDAYS_SHORT = [
  "Yak",
  "Dush",
  "Sesh",
  "Chor",
  "Pay",
  "Jum",
  "Shan",
] as const;

const EN_WEEKDAY_TO_IDX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

interface DateParts {
  day: number;
  monthIdx: number;
  year: number;
  weekdayIdx: number;
}

function getDateParts(date: Date, timeZone?: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: timeZone || undefined,
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const p of parts) {
    lookup[p.type] = p.value;
  }

  return {
    day: Number(lookup.day),
    monthIdx: Number(lookup.month) - 1,
    year: Number(lookup.year),
    weekdayIdx: EN_WEEKDAY_TO_IDX[lookup.weekday ?? ""] ?? 0,
  };
}

export interface UzDateFormatOptions {
  weekday?: "long" | "short";
  /** "long" → "may"; "short" → "may" (4-letter cap, same here); omit to skip month. */
  month?: "long" | "short";
  /** Render the day-of-month. Pair with `month` to get the canonical "18-may". */
  day?: boolean;
  /** Render the year. */
  year?: boolean;
}

/**
 * Format a date in Uzbek (Latin script).
 * Common combos:
 *  - `{ day: true, month: "long" }`               → "18-may"
 *  - `{ weekday: "short", day: true, month: "long" }` → "Dush, 18-may"
 *  - `{ weekday: "short", month: "short", day: true, year: true }` → "Dush, 18-may 2026"
 */
export function formatUzDate(
  date: Date,
  options: UzDateFormatOptions,
  timeZone?: string,
): string {
  const { day, monthIdx, year, weekdayIdx } = getDateParts(date, timeZone);

  const parts: string[] = [];

  if (options.weekday) {
    const wd =
      options.weekday === "short"
        ? UZ_WEEKDAYS_SHORT[weekdayIdx]
        : UZ_WEEKDAYS_LONG[weekdayIdx];
    parts.push(wd);
  }

  let dayMonth = "";
  if (options.day && options.month) {
    const monthName =
      options.month === "long"
        ? UZ_MONTHS_LONG[monthIdx]
        : UZ_MONTHS_SHORT[monthIdx];
    // Uzbek convention: "18-may", hyphen and lowercase month.
    dayMonth = `${day}-${monthName}`;
  } else if (options.day) {
    dayMonth = String(day);
  } else if (options.month) {
    dayMonth =
      options.month === "long"
        ? UZ_MONTHS_LONG[monthIdx]
        : UZ_MONTHS_SHORT[monthIdx];
  }

  if (dayMonth) {
    if (parts.length > 0) {
      // Weekday + day-month joined by a comma: "Dush, 18-may"
      parts[parts.length - 1] = `${parts[parts.length - 1]},`;
    }
    parts.push(dayMonth);
  }

  if (options.year) {
    parts.push(`${year}-yil`);
  }

  return parts.join(" ");
}

/**
 * Format a time-of-day (HH:mm, 24h) honouring `timeZone`. Wraps Intl —
 * exposed here so the rest of the app can route all locale-aware date/time
 * helpers through one module.
 */
export function formatTimeHHMM(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timeZone || undefined,
  }).format(date);
}

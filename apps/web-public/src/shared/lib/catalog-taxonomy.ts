import type { Locale } from "@eventflow/i18n";
import type { DesignIconName } from "@shared/ui/design-system";

/**
 * Canonical taxonomy for indexable category / city landing pages. Kept here
 * (not in the client catalog widget) so routes, metadata, and the sitemap
 * share one source of truth.
 */

export interface CategoryDef {
  slug: string;
  en: string;
  ru: string;
  uz: string;
  /** Fallback glyph when the category has no uploaded icon (same on every surface). */
  icon: DesignIconName;
}

export const EVENT_CATEGORIES: CategoryDef[] = [
  { slug: "business-training", en: "Business training", ru: "Бизнес-тренинги", uz: "Biznes-treninglar", icon: "book" },
  { slug: "business-meetings", en: "Business meetings", ru: "Бизнес-встречи", uz: "Biznes uchrashuvlar", icon: "users" },
  { slug: "workshops", en: "Workshops", ru: "Воркшопы", uz: "Ustaxonalar", icon: "wrench" },
  { slug: "conference", en: "Conferences", ru: "Конференции", uz: "Konferensiyalar", icon: "ticket" },
  { slug: "forum", en: "Forums", ru: "Форумы", uz: "Forumlar", icon: "msg" },
  { slug: "hackathon", en: "Hackathons", ru: "Хакатоны", uz: "Xakatonlar", icon: "code" },
  { slug: "ideathon", en: "Ideathons", ru: "Идеатоны", uz: "Ideatonlar", icon: "bulb" },
];

export interface CityDef {
  code: string;
  en: string;
  ru: string;
  uz: string;
  /** Russian prepositional case ("в Ташкенте"). */
  ruIn: string;
  /** Uzbek locative ("Toshkentdagi"). */
  uzLoc: string;
}

export const EVENT_CITIES: CityDef[] = [
  { code: "tashkent", en: "Tashkent", ru: "Ташкент", uz: "Toshkent", ruIn: "Ташкенте", uzLoc: "Toshkentdagi" },
  { code: "samarkand", en: "Samarkand", ru: "Самарканд", uz: "Samarqand", ruIn: "Самарканде", uzLoc: "Samarqanddagi" },
  { code: "bukhara", en: "Bukhara", ru: "Бухара", uz: "Buxoro", ruIn: "Бухаре", uzLoc: "Buxorodagi" },
  { code: "andijan", en: "Andijan", ru: "Андижан", uz: "Andijon", ruIn: "Андижане", uzLoc: "Andijondagi" },
  { code: "namangan", en: "Namangan", ru: "Наманган", uz: "Namangan", ruIn: "Намангане", uzLoc: "Namangandagi" },
  { code: "fergana", en: "Fergana", ru: "Фергана", uz: "Fargʻona", ruIn: "Фергане", uzLoc: "Fargʻonadagi" },
  { code: "nukus", en: "Nukus", ru: "Нукус", uz: "Nukus", ruIn: "Нукусе", uzLoc: "Nukusdagi" },
  { code: "qarshi", en: "Qarshi", ru: "Карши", uz: "Qarshi", ruIn: "Карши", uzLoc: "Qarshidagi" },
  { code: "urgench", en: "Urgench", ru: "Ургенч", uz: "Urganch", ruIn: "Ургенче", uzLoc: "Urganchdagi" },
  { code: "termez", en: "Termez", ru: "Термез", uz: "Termiz", ruIn: "Термезе", uzLoc: "Termizdagi" },
];

export function getCategory(slug: string): CategoryDef | undefined {
  return EVENT_CATEGORIES.find((c) => c.slug === slug);
}

export function getCity(code: string): CityDef | undefined {
  return EVENT_CITIES.find((c) => c.code === code);
}

function pick(locale: Locale, en: string, ru: string, uz: string): string {
  return locale === "ru" ? ru : locale === "uz" ? uz : en;
}

export function categoryName(cat: CategoryDef, locale: Locale): string {
  return pick(locale, cat.en, cat.ru, cat.uz);
}

export function cityName(city: CityDef, locale: Locale): string {
  return pick(locale, city.en, city.ru, city.uz);
}

/** H1 / title for a category landing page. */
export function categoryHeading(cat: CategoryDef, locale: Locale): string {
  if (locale === "ru") return `${cat.ru} в Узбекистане`;
  if (locale === "uz") return `Oʻzbekistondagi ${cat.uz.toLowerCase()}`;
  return `${cat.en} in Uzbekistan`;
}

/** H1 / title for a city landing page. */
export function cityHeading(city: CityDef, locale: Locale): string {
  if (locale === "ru") return `События в ${city.ruIn}`;
  if (locale === "uz") return `${city.uzLoc} tadbirlar`;
  return `Events in ${city.en}`;
}

/**
 * All known spellings of a city name. The API stores `city` as plain text in
 * mixed forms (codes, transliterations, Cyrillic), so a city landing page
 * needs to filter via every variant to surface the full event set.
 */
export function cityAliases(city: CityDef): string[] {
  // De-dup with a Set since some cities share spellings across scripts.
  return [...new Set([city.code, city.en, city.ru, city.uz])];
}

/** Localized intro sentence for a city landing page. */
export function cityIntro(city: CityDef, locale: Locale): string {
  if (locale === "ru") {
    return `Афиша мероприятий в ${city.ruIn}: предстоящие конференции, форумы, хакатоны и воркшопы. Регистрация на EVENTFLOW бесплатна.`;
  }
  if (locale === "uz") {
    return `${city.uzLoc} tadbirlar afishasi: yaqin konferensiyalar, forumlar, xakatonlar va ustaxonalar. EVENTFLOW orqali roʻyxatdan oʻtish bepul.`;
  }
  return `Discover upcoming events in ${city.en}, Uzbekistan — conferences, forums, hackathons, and workshops. Free registration on EVENTFLOW.`;
}

/** SEO meta description for a city landing page (shorter than intro). */
export function cityMetaDescription(city: CityDef, locale: Locale): string {
  if (locale === "ru") {
    return `Все мероприятия в ${city.ruIn} — даты, площадки и регистрация на EVENTFLOW.`;
  }
  if (locale === "uz") {
    return `${city.uzLoc} barcha tadbirlar — sanalar, joylar va EVENTFLOW orqali roʻyxatdan oʻtish.`;
  }
  return `All events in ${city.en} — dates, venues, and registration on EVENTFLOW.`;
}

export interface RegionDef {
  slug: string;
  en: string;
  ru: string;
  uz: string;
  /** Russian prepositional ("в Самаркандской области"). */
  ruIn: string;
  /** Uzbek locative ("Samarqand viloyatida"). */
  uzLoc: string;
  /** City codes (from EVENT_CITIES) that fall inside this region. */
  cityCodes: readonly string[];
  /**
   * Extra city-name fragments to include in the `cities=` OR-filter when
   * scraping events. Lets us pick up events whose `city` is the region's
   * own name (e.g. organizer wrote "Fergana region" instead of a specific
   * city) without inflating EVENT_CITIES with non-city tokens.
   */
  extraCityAliases?: readonly string[];
}

/**
 * Administrative regions (viloyatlar) of Uzbekistan + Tashkent city. Each
 * region's `cityCodes` references EVENT_CITIES; events are aggregated by
 * OR-matching every alias of every member city against the public events
 * `city` column. Regions whose cities have no upcoming events get
 * `noindex,follow` automatically — same anti-thin policy as cities.
 *
 * Coverage choice: we model every region, including those with no city in
 * our taxonomy (Jizzax, Navoiy, Sirdaryo). They surface zero events today
 * but auto-light-up once organizers publish in those regions — no code
 * change needed.
 */
export const EVENT_REGIONS: readonly RegionDef[] = [
  {
    slug: "tashkent",
    en: "Tashkent City",
    ru: "Город Ташкент",
    uz: "Toshkent shahri",
    ruIn: "Ташкенте",
    uzLoc: "Toshkent shahridagi",
    cityCodes: ["tashkent"],
  },
  {
    slug: "tashkent-region",
    en: "Tashkent Region",
    ru: "Ташкентская область",
    uz: "Toshkent viloyati",
    ruIn: "Ташкентской области",
    uzLoc: "Toshkent viloyatidagi",
    cityCodes: [],
    extraCityAliases: ["Toshkent viloyati", "Ташкентская область"],
  },
  {
    slug: "andijan",
    en: "Andijan Region",
    ru: "Андижанская область",
    uz: "Andijon viloyati",
    ruIn: "Андижанской области",
    uzLoc: "Andijon viloyatidagi",
    cityCodes: ["andijan"],
  },
  {
    slug: "bukhara",
    en: "Bukhara Region",
    ru: "Бухарская область",
    uz: "Buxoro viloyati",
    ruIn: "Бухарской области",
    uzLoc: "Buxoro viloyatidagi",
    cityCodes: ["bukhara"],
  },
  {
    slug: "fergana",
    en: "Fergana Region",
    ru: "Ферганская область",
    uz: "Fargʻona viloyati",
    ruIn: "Ферганской области",
    uzLoc: "Fargʻona viloyatidagi",
    cityCodes: ["fergana"],
  },
  {
    slug: "jizzakh",
    en: "Jizzakh Region",
    ru: "Джизакская область",
    uz: "Jizzax viloyati",
    ruIn: "Джизакской области",
    uzLoc: "Jizzax viloyatidagi",
    cityCodes: [],
    extraCityAliases: ["Jizzax", "Джизак"],
  },
  {
    slug: "karakalpakstan",
    en: "Karakalpakstan",
    ru: "Каракалпакстан",
    uz: "Qoraqalpogʻiston",
    ruIn: "Каракалпакстане",
    uzLoc: "Qoraqalpogʻistondagi",
    cityCodes: ["nukus"],
  },
  {
    slug: "kashkadarya",
    en: "Kashkadarya Region",
    ru: "Кашкадарьинская область",
    uz: "Qashqadaryo viloyati",
    ruIn: "Кашкадарьинской области",
    uzLoc: "Qashqadaryo viloyatidagi",
    cityCodes: ["qarshi"],
  },
  {
    slug: "khorezm",
    en: "Khorezm Region",
    ru: "Хорезмская область",
    uz: "Xorazm viloyati",
    ruIn: "Хорезмской области",
    uzLoc: "Xorazm viloyatidagi",
    cityCodes: ["urgench"],
  },
  {
    slug: "namangan",
    en: "Namangan Region",
    ru: "Наманганская область",
    uz: "Namangan viloyati",
    ruIn: "Наманганской области",
    uzLoc: "Namangan viloyatidagi",
    cityCodes: ["namangan"],
  },
  {
    slug: "navoiy",
    en: "Navoiy Region",
    ru: "Навоийская область",
    uz: "Navoiy viloyati",
    ruIn: "Навоийской области",
    uzLoc: "Navoiy viloyatidagi",
    cityCodes: [],
    extraCityAliases: ["Navoiy", "Навои"],
  },
  {
    slug: "samarkand",
    en: "Samarkand Region",
    ru: "Самаркандская область",
    uz: "Samarqand viloyati",
    ruIn: "Самаркандской области",
    uzLoc: "Samarqand viloyatidagi",
    cityCodes: ["samarkand"],
  },
  {
    slug: "sirdaryo",
    en: "Sirdaryo Region",
    ru: "Сырдарьинская область",
    uz: "Sirdaryo viloyati",
    ruIn: "Сырдарьинской области",
    uzLoc: "Sirdaryo viloyatidagi",
    cityCodes: [],
    extraCityAliases: ["Guliston", "Гулистан"],
  },
  {
    slug: "surxondaryo",
    en: "Surxondaryo Region",
    ru: "Сурхандарьинская область",
    uz: "Surxondaryo viloyati",
    ruIn: "Сурхандарьинской области",
    uzLoc: "Surxondaryo viloyatidagi",
    cityCodes: ["termez"],
  },
];

export function getRegion(slug: string): RegionDef | undefined {
  return EVENT_REGIONS.find((r) => r.slug === slug);
}

/**
 * Every spelling we accept for "events in this region" — combines the
 * locale variants of every member city plus optional extra aliases.
 * Fed into the API's `cities=` OR-filter so a region landing surfaces
 * events stored under any matching form.
 */
export function regionAliases(region: RegionDef): string[] {
  const out = new Set<string>();
  for (const cityCode of region.cityCodes) {
    const city = EVENT_CITIES.find((c) => c.code === cityCode);
    if (city) {
      for (const alias of cityAliases(city)) out.add(alias);
    }
  }
  for (const extra of region.extraCityAliases ?? []) out.add(extra);
  return [...out];
}

export function regionName(region: RegionDef, locale: Locale): string {
  return pick(locale, region.en, region.ru, region.uz);
}

export function regionHeading(region: RegionDef, locale: Locale): string {
  if (locale === "ru") return `События в ${region.ruIn}`;
  if (locale === "uz") return `${region.uzLoc} tadbirlar`;
  return `Events in ${region.en}`;
}

export function regionIntro(region: RegionDef, locale: Locale): string {
  if (locale === "ru") {
    return `Афиша мероприятий в ${region.ruIn}: предстоящие конференции, форумы, хакатоны и воркшопы. Регистрация на EVENTFLOW бесплатна.`;
  }
  if (locale === "uz") {
    return `${region.uzLoc} tadbirlar afishasi: yaqin konferensiyalar, forumlar, xakatonlar va ustaxonalar. EVENTFLOW orqali roʻyxatdan oʻtish bepul.`;
  }
  return `Discover upcoming events in ${region.en}, Uzbekistan — conferences, forums, hackathons, and workshops. Free registration on EVENTFLOW.`;
}

export function regionMetaDescription(
  region: RegionDef,
  locale: Locale,
): string {
  if (locale === "ru") {
    return `Все мероприятия в ${region.ruIn} — даты, площадки и регистрация на EVENTFLOW.`;
  }
  if (locale === "uz") {
    return `${region.uzLoc} barcha tadbirlar — sanalar, joylar va EVENTFLOW orqali roʻyxatdan oʻtish.`;
  }
  return `All events in ${region.en} — dates, venues, and registration on EVENTFLOW.`;
}

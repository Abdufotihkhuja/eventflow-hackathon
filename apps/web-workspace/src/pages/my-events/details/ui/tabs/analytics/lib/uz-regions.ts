/**
 * Canonical Uzbekistan regions + free-text aliases.
 *
 * Used by:
 *   - The analytics filter (region select) — shows the localised name list
 *   - The regions bar list — resolves free-text User.region into a canonical bucket
 *
 * NOTE: this file previously also carried hand-authored SVG polygons for a "map of Uzbekistan"
 * widget. The polygons were schematic guesses and didn't actually look like Uzbekistan, so the
 * map was dropped. If a real choropleth is added later, source proper TopoJSON / GeoJSON of
 * ADM1 boundaries (e.g. Natural Earth) — don't bring the hand-drawn polygons back.
 */

export type UzRegionKey =
  | 'karakalpakstan'
  | 'khorezm'
  | 'navoiy'
  | 'bukhara'
  | 'samarkand'
  | 'qashqadaryo'
  | 'surxondaryo'
  | 'jizzakh'
  | 'sirdaryo'
  | 'tashkent_region'
  | 'tashkent_city'
  | 'namangan'
  | 'andijan'
  | 'fergana'

export type UzRegion = {
  key: UzRegionKey
  ru: string
  en: string
  uz: string
  /** Substrings (lowercased, no diacritics) that should match this region in free-text. */
  aliases: string[]
}

export const UZ_REGIONS: UzRegion[] = [
  {
    key: 'karakalpakstan',
    ru: 'Республика Каракалпакстан',
    en: 'Karakalpakstan',
    uz: 'Qoraqalpogʻiston',
    aliases: ['каракалпакстан', 'karakalpakstan', 'qoraqalpogiston', 'qoraqalpog', 'karakalpak'],
  },
  {
    key: 'khorezm',
    ru: 'Хорезмская область',
    en: 'Khorezm',
    uz: 'Xorazm',
    aliases: ['хорезм', 'khorezm', 'xorazm'],
  },
  {
    key: 'navoiy',
    ru: 'Навоийская область',
    en: 'Navoiy',
    uz: 'Navoiy',
    aliases: ['навои', 'navoi', 'navoiy'],
  },
  {
    key: 'bukhara',
    ru: 'Бухарская область',
    en: 'Bukhara',
    uz: 'Buxoro',
    aliases: ['бухар', 'bukhara', 'buxoro', 'buhar'],
  },
  {
    key: 'samarkand',
    ru: 'Самаркандская область',
    en: 'Samarkand',
    uz: 'Samarqand',
    aliases: ['самарканд', 'samarkand', 'samarqand'],
  },
  {
    key: 'qashqadaryo',
    ru: 'Кашкадарьинская область',
    en: 'Qashqadaryo',
    uz: 'Qashqadaryo',
    aliases: ['кашкадарь', 'qashqadaryo', 'kashkadar'],
  },
  {
    key: 'surxondaryo',
    ru: 'Сурхандарьинская область',
    en: 'Surxondaryo',
    uz: 'Surxondaryo',
    aliases: ['сурхандарь', 'surxondaryo', 'surkhandar'],
  },
  {
    key: 'jizzakh',
    ru: 'Джизакская область',
    en: 'Jizzakh',
    uz: 'Jizzax',
    aliases: ['джизак', 'jizzakh', 'jizzax'],
  },
  {
    key: 'sirdaryo',
    ru: 'Сырдарьинская область',
    en: 'Sirdaryo',
    uz: 'Sirdaryo',
    aliases: ['сырдар', 'sirdaryo', 'syrdaryo'],
  },
  {
    key: 'tashkent_region',
    ru: 'Ташкентская область',
    en: 'Tashkent region',
    uz: 'Toshkent viloyati',
    aliases: [
      'ташкентская область',
      'тошкент вилояти',
      'toshkent viloyati',
      'tashkent region',
      'tashkent viloyat',
    ],
  },
  {
    key: 'tashkent_city',
    ru: 'г. Ташкент',
    en: 'Tashkent city',
    uz: 'Toshkent shahri',
    aliases: [
      'г. ташкент',
      'г.ташкент',
      'город ташкент',
      'ташкент',
      'tashkent',
      'toshkent shahri',
      'toshkent',
    ],
  },
  {
    key: 'namangan',
    ru: 'Наманганская область',
    en: 'Namangan',
    uz: 'Namangan',
    aliases: ['наманган', 'namangan'],
  },
  {
    key: 'andijan',
    ru: 'Андижанская область',
    en: 'Andijan',
    uz: 'Andijon',
    aliases: ['андижан', 'andijan', 'andijon'],
  },
  {
    key: 'fergana',
    ru: 'Ферганская область',
    en: 'Fergana',
    uz: 'Fargʻona',
    aliases: ['фергана', 'fergana', 'fargona', 'fargʻona', 'farghona'],
  },
]

/**
 * Strip diacritics / lowercase / collapse whitespace so aliases match reliably regardless of how
 * the user typed their region. Examples that should all hit `andijan`:
 *   "Andijan", "ANDIJAN", "andijon", "Андижанская область", "г. Андижан".
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ʻ|'|`|ʼ/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Returns the canonical region key for a free-text input, or null if nothing matches.
 *
 * Important: matches against `aliases` substrings, so "Самаркандская область" hits via the
 * "самарканд" alias. Tashkent city vs Tashkent region is disambiguated by checking the more
 * specific alias set first.
 */
export function matchRegion(input: string | null | undefined): UzRegionKey | null {
  if (!input) return null
  const haystack = normalize(input)
  if (!haystack) return null

  // Try the most specific aliases first so "г. Ташкент" → tashkent_city wins over "ташкент".
  const ordered = [...UZ_REGIONS].sort(
    (a, b) =>
      Math.max(...b.aliases.map(a => a.length)) - Math.max(...a.aliases.map(a => a.length)),
  )
  for (const region of ordered) {
    for (const alias of region.aliases) {
      if (haystack.includes(alias)) return region.key
    }
  }
  return null
}

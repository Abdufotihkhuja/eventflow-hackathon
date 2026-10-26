/**
 * Canonical Uzbekistan regions + free-text aliases.
 *
 * Mirrors apps/web-workspace/.../analytics/lib/uz-regions.ts but stays slim — only what the
 * analytics filter needs: a key whitelist and the alias substrings used to match against
 * `User.region` (which is free-text — users in onboarding may type "Андижан", "Andijan region",
 * "Andijon viloyati", etc.).
 *
 * Keep keys in sync with the frontend file; the frontend sends one of these as the `region`
 * query param.
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
  | 'fergana';

export const UZ_REGION_KEYS: readonly UzRegionKey[] = [
  'karakalpakstan',
  'khorezm',
  'navoiy',
  'bukhara',
  'samarkand',
  'qashqadaryo',
  'surxondaryo',
  'jizzakh',
  'sirdaryo',
  'tashkent_region',
  'tashkent_city',
  'namangan',
  'andijan',
  'fergana',
] as const;

/**
 * Lowercase substrings — match against a normalised User.region via Prisma `contains` (case-insensitive).
 * Tashkent city aliases are checked BEFORE Tashkent region by the caller because "ташкент" alone
 * is ambiguous; if a user writes just "Ташкент" we treat that as the city.
 */
export const UZ_REGION_ALIASES: Record<UzRegionKey, string[]> = {
  karakalpakstan: ['каракалпак', 'karakalpak', 'qoraqalpog', 'qoraqalpogiston'],
  khorezm: ['хорезм', 'khorezm', 'xorazm'],
  navoiy: ['навои', 'navoi', 'navoiy'],
  bukhara: ['бухар', 'bukhara', 'buxoro', 'buhar'],
  samarkand: ['самарканд', 'samarkand', 'samarqand'],
  qashqadaryo: ['кашкадарь', 'qashqadaryo', 'kashkadar'],
  surxondaryo: ['сурхандарь', 'surxondaryo', 'surkhandar'],
  jizzakh: ['джизак', 'jizzakh', 'jizzax'],
  sirdaryo: ['сырдар', 'sirdaryo', 'syrdaryo'],
  tashkent_region: [
    'ташкентская область',
    'тошкент вилояти',
    'toshkent viloyati',
    'tashkent region',
    'tashkent viloyat',
  ],
  tashkent_city: [
    'г. ташкент',
    'г.ташкент',
    'город ташкент',
    'ташкент',
    'tashkent',
    'toshkent shahri',
    'toshkent',
  ],
  namangan: ['наманган', 'namangan'],
  andijan: ['андижан', 'andijan', 'andijon'],
  fergana: ['фергана', 'fergana', 'fargona', 'fargʻona', 'farghona'],
};

export function isUzRegionKey(value: unknown): value is UzRegionKey {
  return typeof value === 'string' && (UZ_REGION_KEYS as readonly string[]).includes(value);
}

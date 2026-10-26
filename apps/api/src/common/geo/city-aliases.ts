/**
 * Справочник городов Узбекистана: канонический код → все известные написания.
 *
 * Зачем. Клиенты (мобильное приложение, city landing страницы) присылают город
 * латиницей из собственного справочника («Tashkent», «Navoiy»), а в базе город
 * лежит как придётся: у части событий `Event.city` вообще NULL, а название
 * города зашито в `Event.address` по-русски («Ташкент, Мирзо-Улугбекский район,
 * улица Зиёлилар, 13»). Сырой `contains` по одной строке не находил ничего, и
 * лента в мобилке была пустой.
 *
 * Здесь только данные и чистые функции — без Prisma. Построение условия выборки
 * живёт в `event-city-filter.ts`, чтобы справочник можно было переиспользовать
 * (бэкфилл, аналитика) без зависимости от клиента БД.
 *
 * Родственный файл: `modules/event-analytics/lib/uz-regions.ts` — там регионы
 * (области) для аналитики по `User.region`; здесь — города для фильтра событий.
 */

export type UzCityCode =
  | 'tashkent'
  | 'nurafshon'
  | 'samarkand'
  | 'bukhara'
  | 'andijan'
  | 'namangan'
  | 'fergana'
  | 'kokand'
  | 'margilan'
  | 'qarshi'
  | 'nukus'
  | 'urgench'
  | 'khiva'
  | 'navoiy'
  | 'zarafshan'
  | 'jizzakh'
  | 'termez'
  | 'denau'
  | 'gulistan'
  | 'shakhrisabz'
  | 'chirchik'
  | 'angren'
  | 'almalyk'
  | 'bekabad';

export interface UzCityDefinition {
  code: UzCityCode;
  /**
   * Каноническое русское написание. Именно оно проставляется в `Event.city`
   * бэкфиллом — так город уже записан у событий, где поле заполнено.
   */
  ru: string;
  /**
   * Написания для поиска подстрокой: ru / uz-cyrillic / uz-latin / en.
   * Русские формы даны основой («Бухар», «Ферган»), чтобы ловить падежи
   * («в Бухаре», «Фергане») — сравнение всегда идёт через `contains`.
   * Апостроф в латинице пишем как `'`: варианты (ʻ, ’, `, без апострофа)
   * достраиваются автоматически.
   */
  aliases: string[];
  /**
   * Подстроки-омонимы: улицы, названные в честь города или человека. Нужны там,
   * где название города — популярный годоним: «проспект Алишера Навои» есть
   * почти в каждом ташкентском адресе. Учитываются только при матчинге по
   * адресу и при разборе адреса, но не по полю `Event.city`.
   */
  addressExclusions?: string[];
}

const CITY_DEFINITIONS: UzCityDefinition[] = [
  {
    code: 'tashkent',
    ru: 'Ташкент',
    aliases: ['Ташкент', 'Тошкент', 'Toshkent', 'Tashkent', 'Taschkent'],
  },
  {
    code: 'nurafshon',
    ru: 'Нурафшан',
    aliases: ['Нурафшан', 'Нурафшон', 'Nurafshon', 'Nurafshan'],
  },
  {
    code: 'samarkand',
    ru: 'Самарканд',
    aliases: ['Самарканд', 'Самарқанд', 'Samarqand', 'Samarkand', 'Samarcand'],
  },
  {
    code: 'bukhara',
    ru: 'Бухара',
    aliases: ['Бухар', 'Бухоро', 'Buxoro', 'Bukhara', 'Buhara'],
  },
  {
    code: 'andijan',
    ru: 'Андижан',
    aliases: ['Андижан', 'Андижон', 'Andijon', 'Andijan', 'Andizhan'],
  },
  {
    code: 'namangan',
    ru: 'Наманган',
    aliases: ['Наманган', 'Namangan'],
  },
  {
    code: 'fergana',
    ru: 'Фергана',
    aliases: ['Ферган', 'Фарғона', "Farg'ona", 'Fergana', 'Ferghana'],
  },
  {
    code: 'kokand',
    ru: 'Коканд',
    aliases: ['Коканд', 'Қўқон', "Qo'qon", 'Kokand', 'Quqon'],
  },
  {
    code: 'margilan',
    ru: 'Маргилан',
    aliases: ['Маргилан', 'Марғилон', "Marg'ilon", 'Margilan', 'Margilon'],
  },
  {
    code: 'qarshi',
    ru: 'Карши',
    aliases: ['Карши', 'Қарши', 'Qarshi', 'Karshi'],
  },
  {
    code: 'nukus',
    ru: 'Нукус',
    aliases: ['Нукус', 'Нөкис', 'Nukus', 'Nokis'],
  },
  {
    code: 'urgench',
    ru: 'Ургенч',
    aliases: ['Ургенч', 'Урганч', 'Urganch', 'Urgench'],
  },
  {
    code: 'khiva',
    ru: 'Хива',
    aliases: ['Хива', 'Хиве', 'Хивы', 'Хиванск', 'Xiva', 'Khiva', 'Chiva'],
  },
  {
    code: 'navoiy',
    ru: 'Навои',
    aliases: ['Навои', 'Навоий', 'Navoiy', 'Navoi', 'Nawoi'],
    // «Навои» — самая частая улица страны, поэтому по адресу город засчитываем
    // только если рядом нет годонимного контекста.
    addressExclusions: [
      'Алишера Навои',
      'Алишер Навои',
      'Alisher Navoi',
      'улица Навои',
      'проспект Навои',
      "Navoiy ko'chasi",
      "Navoi ko'chasi",
    ],
  },
  {
    code: 'zarafshan',
    ru: 'Зарафшан',
    aliases: ['Зарафшан', 'Зарафшон', 'Zarafshon', 'Zarafshan'],
  },
  {
    code: 'jizzakh',
    ru: 'Джизак',
    aliases: ['Джизак', 'Жиззах', 'Jizzax', 'Jizzakh', 'Dzhizak'],
  },
  {
    code: 'termez',
    ru: 'Термез',
    aliases: ['Термез', 'Термиз', 'Termiz', 'Termez'],
  },
  {
    code: 'denau',
    ru: 'Денау',
    aliases: ['Денау', 'Денов', 'Denov', 'Denau'],
  },
  {
    code: 'gulistan',
    ru: 'Гулистан',
    aliases: ['Гулистан', 'Гулистон', 'Guliston', 'Gulistan'],
  },
  {
    code: 'shakhrisabz',
    ru: 'Шахрисабз',
    aliases: ['Шахрисабз', 'Шаҳрисабз', 'Shahrisabz', 'Shakhrisabz'],
  },
  {
    code: 'chirchik',
    ru: 'Чирчик',
    aliases: ['Чирчик', 'Чирчиқ', 'Chirchiq', 'Chirchik'],
  },
  {
    code: 'angren',
    ru: 'Ангрен',
    aliases: ['Ангрен', 'Angren'],
  },
  {
    code: 'almalyk',
    ru: 'Алмалык',
    aliases: ['Алмалык', 'Олмалиқ', 'Olmaliq', 'Almalyk', 'Almalik'],
  },
  {
    code: 'bekabad',
    ru: 'Бекабад',
    aliases: ['Бекабад', 'Бекобод', 'Bekobod', 'Bekabad'],
  },
];

/** Все варианты апострофа, которые реально встречаются в узбекской латинице. */
const APOSTROPHE_VARIANTS = [
  "'",
  '’', // ’
  '‘', // ‘
  'ʻ', // ʻ (официальный узбекский)
  'ʼ', // ʼ
  '`',
];

const APOSTROPHE_RE = /['’‘ʻʼʽ`´]/g;

/** Кириллические буквы, которые складываем к «общему знаменателю». */
const CHAR_FOLD: Record<string, string> = {
  ё: 'е',
  ў: 'у',
  қ: 'к',
  ғ: 'г',
  ҳ: 'х',
  ө: 'о',
  ъ: '',
  ь: '',
};

const FOLD_RE = /[ёўқғҳөъь]/g;

/**
 * Приводит написание города к сравнимому виду: нижний регистр, ё→е,
 * уз-кириллица → русские аналоги, апострофы выброшены, дефисы и повторные
 * пробелы схлопнуты. Запятые и точки сохраняются — по ним разбираем адрес.
 */
export function normalizeCityName(value: string): string {
  return value
    .toLowerCase()
    .replace(FOLD_RE, (c) => CHAR_FOLD[c] ?? c)
    .replace(APOSTROPHE_RE, '')
    .replace(/[-–—_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Достраивает варианты написания с разными апострофами (и вовсе без него). */
function expandApostrophes(alias: string): string[] {
  if (!alias.includes("'")) return [alias];
  const variants = new Set<string>([alias.replace(/'/g, '')]);
  for (const ch of APOSTROPHE_VARIANTS) {
    variants.add(alias.replace(/'/g, ch));
  }
  return [...variants];
}

export const UZ_CITIES: readonly UzCityDefinition[] = CITY_DEFINITIONS;

export const UZ_CITY_CODES: readonly UzCityCode[] = CITY_DEFINITIONS.map(
  (c) => c.code,
);

const CITY_BY_CODE = new Map<UzCityCode, UzCityDefinition>(
  CITY_DEFINITIONS.map((c) => [c.code, c]),
);

/**
 * Написания для поиска подстрокой в БД (`contains`), уже с вариантами
 * апострофа. В отличие от `normalizeCityName` регистр не трогаем: сравнение
 * в Prisma идёт с `mode: 'insensitive'`.
 */
const SEARCH_ALIASES = new Map<UzCityCode, string[]>(
  CITY_DEFINITIONS.map((c) => [
    c.code,
    [...new Set(c.aliases.flatMap(expandApostrophes))],
  ]),
);

const ADDRESS_EXCLUSIONS = new Map<UzCityCode, string[]>(
  CITY_DEFINITIONS.map((c) => [
    c.code,
    [...new Set((c.addressExclusions ?? []).flatMap(expandApostrophes))],
  ]),
);

/** Нормализованные алиасы для точного резолва входного параметра. */
const CODE_BY_NORMALIZED_ALIAS = new Map<string, UzCityCode>();
for (const city of CITY_DEFINITIONS) {
  for (const alias of [city.ru, ...city.aliases]) {
    CODE_BY_NORMALIZED_ALIAS.set(normalizeCityName(alias), city.code);
  }
  CODE_BY_NORMALIZED_ALIAS.set(city.code, city.code);
}

/** Нормализованные алиасы для поиска в свободном тексте (адресе). */
const NORMALIZED_ALIASES: { code: UzCityCode; alias: string }[] =
  CITY_DEFINITIONS.flatMap((city) =>
    [...new Set(city.aliases.map(normalizeCityName))].map((alias) => ({
      code: city.code,
      alias,
    })),
  );

/**
 * Маркеры годонима: если перед найденным названием в том же сегменте адреса
 * стоит «улица» / «проспект» / «ko'chasi», это улица, а не город.
 */
const STREET_MARKERS = [
  'улица',
  'ул.',
  'ул ',
  'проспект',
  'просп',
  'пр т',
  'пр.',
  'шоссе',
  'переулок',
  'пер.',
  'площадь',
  'массив',
  'мкр',
  'микрорайон',
  'квартал',
  'кучаси',
  'куча',
  'кочаси',
  'kochasi',
  'kocha',
  'kucha',
  'prospekt',
  'shoh kocha',
  'yoli',
  'street',
  'avenue',
  'square',
];

const SEGMENT_SEPARATORS = /[,;/|\n]/;

function isLetterOrDigit(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
}

/** Текст сегмента адреса до найденного вхождения (от предыдущей запятой). */
function segmentPrefix(text: string, index: number): string {
  let start = 0;
  for (let i = index - 1; i >= 0; i--) {
    if (SEGMENT_SEPARATORS.test(text[i])) {
      start = i + 1;
      break;
    }
  }
  return text.slice(start, index);
}

export interface CityMatch {
  code: UzCityCode;
  /** Нормализованный алиас, который совпал. */
  alias: string;
  /** Позиция вхождения в нормализованном тексте. */
  index: number;
}

/**
 * Ищет город в свободном тексте (адрес, venue). Возвращает ПЕРВОЕ по позиции
 * вхождение: геокодер пишет город в начале строки, а дальше идут район, улица
 * и — в наших данных — мусорный хвост вида «13Южная Остроботния, Эхтяри».
 *
 * Вхождения, перед которыми в том же сегменте стоит маркер улицы, а также
 * попавшие в явные исключения города («проспект Алишера Навои»), пропускаются.
 */
export function findCityInText(text: string): CityMatch | null {
  if (!text) return null;
  const haystack = normalizeCityName(text);
  if (!haystack) return null;

  let best: CityMatch | null = null;

  for (const { code, alias } of NORMALIZED_ALIASES) {
    const excluded = (ADDRESS_EXCLUSIONS.get(code) ?? []).some((exclusion) =>
      haystack.includes(normalizeCityName(exclusion)),
    );
    if (excluded) continue;

    let from = 0;
    for (;;) {
      const index = haystack.indexOf(alias, from);
      if (index === -1) break;
      from = index + 1;

      // Совпадение должно начинаться с границы слова; окончание может быть
      // любым — «Ташкентская область» и «Андижанский район» это тот же город.
      if (isLetterOrDigit(haystack[index - 1])) continue;

      const prefix = segmentPrefix(haystack, index);
      if (STREET_MARKERS.some((marker) => prefix.includes(marker))) continue;

      if (
        best === null ||
        index < best.index ||
        (index === best.index && alias.length > best.alias.length)
      ) {
        best = { code, alias, index };
      }
      break;
    }
  }

  return best;
}

/**
 * Резолвит присланное клиентом значение фильтра в канонический код города.
 * Сначала точное совпадение по справочнику («Tashkent», «Тошкент», «TOSHKENT»),
 * затем — поиск города внутри строки («г. Ташкент», «Tashkent city»).
 * `null` — город неизвестен, вызывающий код работает как раньше.
 */
export function resolveCityCode(value: string): UzCityCode | null {
  const normalized = normalizeCityName(value ?? '');
  if (!normalized) return null;
  const direct = CODE_BY_NORMALIZED_ALIAS.get(normalized);
  if (direct) return direct;
  return findCityInText(value)?.code ?? null;
}

export function getCityDefinition(code: UzCityCode): UzCityDefinition {
  const city = CITY_BY_CODE.get(code);
  if (!city) throw new Error(`Unknown city code: ${code}`);
  return city;
}

/** Все написания города для поиска подстрокой в БД. */
export function getCitySearchAliases(code: UzCityCode): string[] {
  return SEARCH_ALIASES.get(code) ?? [];
}

/** Подстроки-омонимы, которые не должны засчитываться как адрес города. */
export function getCityAddressExclusions(code: UzCityCode): string[] {
  return ADDRESS_EXCLUSIONS.get(code) ?? [];
}

/** Каноническое русское название — то, что пишем в `Event.city`. */
export function getCanonicalRuCityName(code: UzCityCode): string {
  return getCityDefinition(code).ru;
}

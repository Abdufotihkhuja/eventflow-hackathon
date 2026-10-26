import {
  findCityInText,
  getCanonicalRuCityName,
  normalizeCityName,
  resolveCityCode,
} from './city-aliases';
import { buildEventCitiesWhere, buildEventCityWhere } from './event-city-filter';

/** Реальная строка адреса с прода (событие NEXUS30): город в начале, дальше
 *  район, улица и мусорный хвост геокодера без разделителя. */
const NEXUS30_ADDRESS =
  'Ташкент, Мирзо-Улугбекский район, улица Зиёлилар, 13Южная Остроботния, Эхтяри, Инха';

describe('normalizeCityName', () => {
  it('сводит регистр, ё и апострофы к одной форме', () => {
    expect(normalizeCityName('  ТАШКЕНТ ')).toBe(normalizeCityName('Ташкент'));
    expect(normalizeCityName('Фёдоровка')).toBe(normalizeCityName('Федоровка'));
    expect(normalizeCityName("Farg'ona")).toBe(normalizeCityName('Fargʻona'));
  });
});

describe('resolveCityCode', () => {
  it('резолвит написания одного города в один код', () => {
    for (const spelling of ['Tashkent', 'Ташкент', 'Toshkent', 'TOSHKENT']) {
      expect(resolveCityCode(spelling)).toBe('tashkent');
    }
  });

  it('находит город внутри строки', () => {
    expect(resolveCityCode('г. Ташкент')).toBe('tashkent');
  });

  it('возвращает null для неизвестного города', () => {
    expect(resolveCityCode('Хельсинки')).toBeNull();
    expect(resolveCityCode('')).toBeNull();
  });
});

describe('findCityInText', () => {
  it('берёт первый город из адреса и игнорирует мусорный хвост', () => {
    expect(findCityInText(NEXUS30_ADDRESS)?.code).toBe('tashkent');
  });

  it('не считает городом годоним («проспект Алишера Навои» в Ташкенте)', () => {
    const match = findCityInText('Ташкент, проспект Алишера Навои, 12');
    expect(match?.code).toBe('tashkent');
  });

  it('находит город в адресе Навои', () => {
    expect(findCityInText('Навои, Shirin Madaniyat saroyi')?.code).toBe(
      'navoiy',
    );
  });

  it('канонизирует код в русское название для записи в Event.city', () => {
    expect(getCanonicalRuCityName('tashkent')).toBe('Ташкент');
  });
});

describe('buildEventCityWhere', () => {
  it('пустой фильтр — undefined (условие не добавляется)', () => {
    expect(buildEventCityWhere(undefined)).toBeUndefined();
    expect(buildEventCityWhere('   ')).toBeUndefined();
  });

  it('неизвестный город работает как раньше — contains по строке', () => {
    expect(buildEventCityWhere('Хельсинки')).toEqual({
      city: { contains: 'Хельсинки', mode: 'insensitive' },
    });
  });

  it('известный город разворачивается в алиасы + фолбэк на адрес', () => {
    const where = buildEventCityWhere('Tashkent');
    const branches = where?.OR as Array<Record<string, unknown>>;
    expect(Array.isArray(branches)).toBe(true);

    // Русское написание в Event.city ищется наравне с латиницей.
    const cityAliases = branches
      .filter((b) => 'city' in b)
      .map((b) => (b.city as { contains: string }).contains.toLowerCase());
    expect(cityAliases).toEqual(
      expect.arrayContaining(['ташкент', 'tashkent', 'toshkent']),
    );

    // Фолбэк на адрес применяется только когда city не заполнен.
    const addressBranch = branches.find((b) => 'AND' in b);
    expect(addressBranch).toBeDefined();
    expect(JSON.stringify(addressBranch)).toContain('address');
    expect(JSON.stringify(addressBranch)).toContain('null');
  });

  it('онлайн-события видны при любом выбранном городе', () => {
    const branches = buildEventCityWhere('Tashkent')?.OR as Array<
      Record<string, unknown>
    >;
    expect(branches).toEqual(expect.arrayContaining([{ format: 'ONLINE' }]));
  });

  it('разные написания одного города схлопываются в одну ветку', () => {
    const many = buildEventCitiesWhere('tashkent,Ташкент,Toshkent');
    const one = buildEventCityWhere('Tashkent');
    expect(many).toEqual(one);
  });

  it('разные города остаются отдельными ветками', () => {
    const where = buildEventCitiesWhere('Tashkent,Navoiy');
    expect((where?.OR as unknown[]).length).toBe(2);
  });

  it('пустой список городов не даёт пустой OR', () => {
    expect(buildEventCitiesWhere('')).toBeUndefined();
    expect(buildEventCitiesWhere(' , , ')).toBeUndefined();
  });
});

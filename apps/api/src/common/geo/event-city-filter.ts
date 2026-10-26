import { EventFormat, Prisma } from '@prisma/client';
import {
  getCityAddressExclusions,
  getCitySearchAliases,
  resolveCityCode,
} from './city-aliases';

/**
 * Условие выборки событий по городу — единая точка для всех репозиториев
 * (`events.repository`, `public.repository`).
 *
 * Раньше фильтр был сырым `city: { contains: <как прислали> }`, и он не находил
 * ничего: мобильное приложение шлёт латиницу («Tashkent»), а в базе город либо
 * по-русски («Ташкент»), либо вовсе NULL — с названием внутри `address`.
 *
 * Правила:
 *  1. Значение резолвится в канонический код города по справочнику алиасов.
 *     Не резолвится (иностранный город, произвольный текст) — работаем как
 *     раньше: `contains` по строке.
 *  2. Резолвится — событие подходит, если ЛЮБОЕ из:
 *     • `Event.city` содержит любой из алиасов города;
 *     • `Event.city` не заполнен, а `Event.address` содержит любой из алиасов.
 *
 * Почему адрес смотрим только при пустом `city`: заполненный `city` —
 * авторитетное поле, а адрес полон омонимов (в каждом втором ташкентском
 * адресе есть «проспект Алишера Навои»). Иначе фильтр по Навои возвращал бы
 * ташкентские события. Дополнительно у неоднозначных городов есть список
 * исключений — годонимы, которые не считаются адресом города.
 */
export function buildEventCityWhere(
  city: string | undefined | null,
): Prisma.EventWhereInput | undefined {
  const raw = city?.trim();
  if (!raw) return undefined;

  const code = resolveCityCode(raw);
  if (!code) {
    return { city: { contains: raw, mode: 'insensitive' } };
  }

  const aliases = getCitySearchAliases(code);
  const exclusions = getCityAddressExclusions(code);

  const addressBranch: Prisma.EventWhereInput = {
    AND: [
      { OR: [{ city: null }, { city: '' }] },
      {
        OR: aliases.map((alias) => ({
          address: { contains: alias, mode: 'insensitive' as const },
        })),
      },
      ...exclusions.map((exclusion) => ({
        NOT: {
          address: { contains: exclusion, mode: 'insensitive' as const },
        },
      })),
    ],
  };

  return {
    OR: [
      ...aliases.map((alias) => ({
        city: { contains: alias, mode: 'insensitive' as const },
      })),
      addressBranch,
      // Онлайн-события доступны из любого региона, и города у них нет по
      // определению — без этой ветки они выпадали из ленты у всех, кто выбрал
      // город. HYBRID сюда не входит: у него есть площадка, значит и город.
      { format: EventFormat.ONLINE },
    ],
  };
}

/**
 * То же для списка альтернативных написаний (параметр `cities` у city landing
 * страниц: «tashkent,Ташкент,Toshkent»). Пустые элементы отбрасываются; если
 * не осталось ни одного, возвращаем `undefined`, а не пустой `OR` — Prisma
 * такой отвергает.
 */
export function buildEventCitiesWhere(
  cities: string | undefined | null,
): Prisma.EventWhereInput | undefined {
  // Написания одного города («tashkent,Ташкент,Toshkent») резолвятся в один код
  // и дали бы три одинаковые ветки OR — схлопываем их до одной.
  const seen = new Set<string>();
  const clauses = (cities ?? '')
    .split(',')
    .map((variant) => variant.trim())
    .filter((variant) => variant.length > 0)
    .filter((variant) => {
      const key = resolveCityCode(variant) ?? `raw:${variant.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((variant) => buildEventCityWhere(variant))
    .filter((clause): clause is Prisma.EventWhereInput => clause !== undefined);

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { OR: clauses };
}

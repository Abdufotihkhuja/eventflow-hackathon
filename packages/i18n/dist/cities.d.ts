import type { Translator } from "./types.js";
import type { TranslatableOption } from "./static-data.js";
/**
 * Каталог городов Узбекистана + специальные значения.
 * Стабильные slug-коды хранятся в БД (event.city, rental_place.city,
 * profile.city). Локализация — через i18n keys "cities.<code>".
 */
export declare const UZ_CITY_CODES: readonly ["tashkent", "samarkand", "bukhara", "andijan", "namangan", "fergana", "nukus", "qarshi", "termez", "urgench", "khiva", "navoi", "jizzakh", "gulistan", "nurafshon", "kokand", "margilan", "chirchiq", "angren", "almalyk"];
export type UzCityCode = (typeof UZ_CITY_CODES)[number];
export declare const UZ_CITY_LABEL_KEYS: Readonly<Record<UzCityCode, string>>;
/**
 * Возвращает локализованное имя города по коду.
 * Если код неизвестен — возвращает сам код (degraded но безопасно).
 */
export declare function getCityLabel(t: Translator): (code: string | null | undefined) => string;
export declare function isUzCityCode(value: unknown): value is UzCityCode;
/**
 * Опции для <Select> на форме. Сортируются по локализованному имени.
 */
export declare function getUzCityOptions(t: Translator): TranslatableOption[];
//# sourceMappingURL=cities.d.ts.map
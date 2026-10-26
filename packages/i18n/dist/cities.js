import { createLabelGetter } from "./static-data.js";
/**
 * Каталог городов Узбекистана + специальные значения.
 * Стабильные slug-коды хранятся в БД (event.city, rental_place.city,
 * profile.city). Локализация — через i18n keys "cities.<code>".
 */
export const UZ_CITY_CODES = [
    "tashkent",
    "samarkand",
    "bukhara",
    "andijan",
    "namangan",
    "fergana",
    "nukus",
    "qarshi",
    "termez",
    "urgench",
    "khiva",
    "navoi",
    "jizzakh",
    "gulistan",
    "nurafshon",
    "kokand",
    "margilan",
    "chirchiq",
    "angren",
    "almalyk",
];
export const UZ_CITY_LABEL_KEYS = {
    tashkent: "cities.tashkent",
    samarkand: "cities.samarkand",
    bukhara: "cities.bukhara",
    andijan: "cities.andijan",
    namangan: "cities.namangan",
    fergana: "cities.fergana",
    nukus: "cities.nukus",
    qarshi: "cities.qarshi",
    termez: "cities.termez",
    urgench: "cities.urgench",
    khiva: "cities.khiva",
    navoi: "cities.navoi",
    jizzakh: "cities.jizzakh",
    gulistan: "cities.gulistan",
    nurafshon: "cities.nurafshon",
    kokand: "cities.kokand",
    margilan: "cities.margilan",
    chirchiq: "cities.chirchiq",
    angren: "cities.angren",
    almalyk: "cities.almalyk",
};
/**
 * Возвращает локализованное имя города по коду.
 * Если код неизвестен — возвращает сам код (degraded но безопасно).
 */
export function getCityLabel(t) {
    const getter = createLabelGetter(UZ_CITY_LABEL_KEYS, t);
    return (code) => {
        if (!code)
            return "";
        if (isUzCityCode(code)) {
            const label = getter(code);
            if (label)
                return label;
        }
        // Backwards compatibility: legacy text values хранились до миграции на коды
        return code;
    };
}
export function isUzCityCode(value) {
    return typeof value === "string" && UZ_CITY_CODES.includes(value);
}
/**
 * Опции для <Select> на форме. Сортируются по локализованному имени.
 */
export function getUzCityOptions(t) {
    return UZ_CITY_CODES.map((code) => ({
        value: code,
        labelKey: UZ_CITY_LABEL_KEYS[code],
    }));
}
//# sourceMappingURL=cities.js.map
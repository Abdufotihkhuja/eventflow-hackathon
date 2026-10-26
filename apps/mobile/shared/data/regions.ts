/**
 * Region / city catalog for the Discover location filter. `city` is the value
 * sent to the events API (`PublicEventsQuery.city`) and MUST match the canonical
 * English city string the backend stores; `label` is the localized display name.
 * `code: "all"` clears the filter.
 */
import type { L } from "./events";

export interface Region {
  code: string;
  /** API `city` filter value (English canonical), or null for "all regions". */
  city: string | null;
  label: L;
  /** Map center for the events map, `[lon, lat]` (Yandex Maps order). "all" = the country view. */
  coords: [number, number];
}

export const REGIONS: Region[] = [
  { code: "all", city: null, label: { uz: "Barcha hududlar", ru: "Все регионы", en: "All regions" }, coords: [64.5853, 41.3775] },
  { code: "tashkent", city: "Tashkent", label: { uz: "Toshkent", ru: "Ташкент", en: "Tashkent" }, coords: [69.2401, 41.3111] },
  { code: "samarkand", city: "Samarkand", label: { uz: "Samarqand", ru: "Самарканд", en: "Samarkand" }, coords: [66.9597, 39.6542] },
  { code: "bukhara", city: "Bukhara", label: { uz: "Buxoro", ru: "Бухара", en: "Bukhara" }, coords: [64.4286, 39.7747] },
  { code: "andijan", city: "Andijan", label: { uz: "Andijon", ru: "Андижан", en: "Andijan" }, coords: [72.3442, 40.7821] },
  { code: "namangan", city: "Namangan", label: { uz: "Namangan", ru: "Наманган", en: "Namangan" }, coords: [71.6726, 40.9983] },
  { code: "fergana", city: "Fergana", label: { uz: "Farg'ona", ru: "Фергана", en: "Fergana" }, coords: [71.7843, 40.3864] },
  { code: "qarshi", city: "Qarshi", label: { uz: "Qarshi", ru: "Карши", en: "Qarshi" }, coords: [65.7891, 38.8606] },
  { code: "nukus", city: "Nukus", label: { uz: "Nukus", ru: "Нукус", en: "Nukus" }, coords: [59.6103, 42.4531] },
  { code: "urgench", city: "Urgench", label: { uz: "Urganch", ru: "Ургенч", en: "Urgench" }, coords: [60.625, 41.5506] },
  { code: "navoiy", city: "Navoiy", label: { uz: "Navoiy", ru: "Навои", en: "Navoiy" }, coords: [65.3792, 40.0844] },
  { code: "jizzakh", city: "Jizzakh", label: { uz: "Jizzax", ru: "Джизак", en: "Jizzakh" }, coords: [67.8422, 40.1158] },
  { code: "termez", city: "Termez", label: { uz: "Termiz", ru: "Термез", en: "Termez" }, coords: [67.2783, 37.2242] },
  { code: "gulistan", city: "Gulistan", label: { uz: "Guliston", ru: "Гулистан", en: "Gulistan" }, coords: [68.7842, 40.4897] },
];

/** Default region for a device whose region is Uzbekistan (the capital). */
export const DEFAULT_UZ_REGION = "tashkent";

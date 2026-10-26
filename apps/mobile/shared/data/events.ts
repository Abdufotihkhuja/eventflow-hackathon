/**
 * Shared view-model types for events. Screens render REAL data from the public
 * SDK (see `entities/event`), mapped into `EventItem` by the view-model adapters
 * (`toCardEvent` / `toDetailEvent`). Only the localized-string + event-shape
 * types live here — the old prototype fixtures (EVENTS/getEvent/CATEGORIES) were
 * removed as dead code (FND-20).
 */
export type Lang = "uz" | "ru" | "en";

/** A localized string. */
export type L = Record<Lang, string>;

export interface EventItem {
  id: string;
  title: L;
  org: string;
  /** Absolute organizer logo URL, when the organization has one. Cards show it
   *  next to the organizer name so a feed row carries its publisher's mark. */
  orgLogo?: string;
  date: string;
  time: string;
  venue: L;
  city: L;
  price: L;
  free: boolean;
  cat: string;
  catLabel: L;
  going: number;
  capacity: number;
  /** Day-of-month and short month, split out for the poster plate (the combined
   *  `date` stamp stays for card/detail text). Empty when the source date is
   *  unparseable — the plate falls back to `date`. */
  day: string;
  month: string;
  hue: number;
  pattern: "sunburst" | "grid" | "arches" | "dots" | "rays";
  /** Absolute cover-image URL. When set, the real photo replaces the
   *  procedural poster (hue/pattern stay as the fallback for events without one). */
  coverImage?: string;
  pick?: boolean;
  about: L;
}

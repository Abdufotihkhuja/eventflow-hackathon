export type DesignEventPattern =
  | "sunburst"
  | "grid"
  | "arches"
  | "dots"
  | "rays";

export interface DesignEvent {
  id: string;
  slug?: string;
  title: string;
  /** Краткое описание (event.shortDescription) — превью под заголовком в карточке. */
  shortDescription?: string;
  org: string;
  orgLogo?: string;
  cover?: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  /** Stable city select-code (e.g. "tashkent") for filtering; `city` is the localized label. */
  cityCode?: string;
  price: string;
  cat: string;
  catLabel: string;
  going: number;
  capacity: number;
  hue: number;
  pattern: DesignEventPattern;
  pick?: boolean;
}

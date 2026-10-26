import { ANALYTICS_ENABLED } from "./config";

type DataLayerObject = Record<string, unknown>;

/** GA4-style ecommerce item. */
export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_list_name?: string;
  price?: number;
}

function getDataLayer(): Array<DataLayerObject> | null {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return null;
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

/** Low-level push (no-op when analytics is disabled or on the server). */
export function pushDataLayer(payload: DataLayerObject): void {
  getDataLayer()?.push(payload);
}

/** A plain GTM/GA4 custom event with optional params. */
export function trackEvent(event: string, params?: DataLayerObject): void {
  pushDataLayer({ event, ...params });
}

/**
 * A GA4-style ecommerce event (`view_item`, `select_item`, …). `ecommerce` is
 * cleared first so GA4 tags don't merge items from a previous push.
 */
export function trackEcommerce(
  event: string,
  items: AnalyticsItem[],
  extra?: DataLayerObject,
): void {
  const dl = getDataLayer();
  if (!dl) return;
  dl.push({ ecommerce: null });
  dl.push({ event, ecommerce: { items, ...extra } });
}

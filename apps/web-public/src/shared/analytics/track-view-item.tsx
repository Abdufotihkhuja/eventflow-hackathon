"use client";

import { useTrackViewItem } from "./use-track-view-item";

import type { AnalyticsItem } from "./track";

interface TrackViewItemProps {
  item: AnalyticsItem;
  currency?: string;
  value?: number;
}

/** Ничего не рендерит: точка монтирования для GA4 `view_item`. */
export function TrackViewItem({
  item,
  currency,
  value,
}: TrackViewItemProps): null {
  useTrackViewItem(item, currency, value);
  return null;
}

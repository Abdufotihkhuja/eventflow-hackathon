"use client";

/** Разовая отправка GA4 `view_item` при монтировании карточки товара/события. */

import { useEffect, useRef } from "react";

import { trackEcommerce, type AnalyticsItem } from "./track";

export function useTrackViewItem(
  item: AnalyticsItem,
  currency?: string,
  value?: number
): void {
  const fired = useRef(false);

  // eslint-disable-next-line no-restricted-syntax -- разовый side-effect монтирования, инкапсулирован в кастомный хук
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEcommerce("view_item", [item], { currency, value });
  }, [item, currency, value]);
}

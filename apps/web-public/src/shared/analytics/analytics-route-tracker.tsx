"use client";

import { useRouteAnalytics } from "./use-route-analytics";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * Ничего не рендерит: точка монтирования для отправки SPA-переходов в
 * аналитику. Вся логика — в хуке `useRouteAnalytics`.
 */
export function AnalyticsRouteTracker(): null {
  useRouteAnalytics();
  return null;
}

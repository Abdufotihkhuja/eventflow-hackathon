"use client";

/**
 * Отправляет SPA-переходы в Yandex.Metrika (`hit`) и GTM (`dataLayer`
 * pageview): клиентская навигация не перезагружает страницу, поэтому сами
 * теги её не считают. Первый просмотр пропускаем — он уже посчитан при
 * инициализации Метрики и загрузке контейнера GTM.
 */

import { useEffect, useRef } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { ANALYTICS_ENABLED, YM_ID } from "./config";

const ymId = Number(YM_ID);

export function useRouteAnalytics(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);
  const prevPath = useRef<string | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- side-effect навигации, инкапсулирован в кастомный хук
  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;

    const qs = searchParams?.toString();
    const path = `${pathname}${qs ? `?${qs}` : ""}`;

    // Первый прогон пропускаем — этот просмотр уже учтён при загрузке.
    if (isFirst.current) {
      isFirst.current = false;
      prevPath.current = path;
      return;
    }
    if (path === prevPath.current) return;

    const { origin } = window.location;
    const url = origin + path;
    const referer = prevPath.current
      ? origin + prevPath.current
      : document.referrer;

    window.ym?.(ymId, "hit", url, { title: document.title, referer });
    window.dataLayer?.push({
      event: "pageview",
      page_path: path,
      page_location: url,
      page_title: document.title,
    });

    prevPath.current = path;
  }, [pathname, searchParams]);
}

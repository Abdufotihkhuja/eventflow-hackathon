"use client";

import { useCallback, useEffect, useRef } from "react";

import Script from "next/script";

const YANDEX_MAPS_SCRIPT_BASE = "https://api-maps.yandex.ru/v3/?lang=ru_RU";

/** Глобальный ymaps3 после загрузки скрипта (Yandex Maps JavaScript API 3.0) */
declare global {
  interface Window {
    ymaps3?: {
      ready: Promise<void>;
      YMap: new (
        container: HTMLElement,
        props: { location: { center: [number, number]; zoom: number } }
      ) => { addChild: (child: unknown) => void; destroy: () => void };
      YMapDefaultSchemeLayer: new () => unknown;
      YMapDefaultFeaturesLayer: new () => unknown;
      YMapMarker: new (
        props: { coordinates: [number, number] },
        element: HTMLElement
      ) => unknown;
    };
  }
}

export interface YandexMapEmbedProps {
  /** Широта */
  latitude: string;
  /** Долгота */
  longitude: string;
  /** Дополнительные классы контейнера карты */
  className?: string;
}

/** Хук очистки инстанса карты при размонтировании (инкапсулирует useEffect) */
function useYandexMapCleanupHook(
  mapInstanceRef: React.MutableRefObject<{ destroy?: () => void } | null>
): void {
  // cleanup при размонтировании — допустимое использование в кастомном хуке (no-restricted-syntax)
  // eslint-disable-next-line no-restricted-syntax -- хук, не прикладной компонент; только cleanup
  useEffect(() => {
    return () => {
      const map = mapInstanceRef.current;
      if (map?.destroy) {
        try {
          map.destroy();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
  }, [mapInstanceRef]);
}

/**
 * Встраиваемая карта Яндекс.Карты (JavaScript API 3.0).
 * Требует NEXT_PUBLIC_YANDEX_MAPS_API_KEY в .env.
 */
export function YandexMapEmbed({
  latitude,
  longitude,
  className,
}: YandexMapEmbedProps): React.ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const apiKey =
    typeof process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY === "string"
      ? process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY.trim()
      : "";

  const initMap = useCallback(() => {
    if (!containerRef.current || !apiKey) return;
    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);
    if (Number.isNaN(lon) || Number.isNaN(lat)) return;

    const ymaps3 = window.ymaps3;
    if (!ymaps3) return;

    void ymaps3.ready.then(() => {
      const container = containerRef.current;
      if (!container) return;

      const {
        YMap,
        YMapDefaultSchemeLayer,
        YMapDefaultFeaturesLayer,
        YMapMarker,
      } = ymaps3;
      const map = new YMap(container, {
        location: {
          center: [lon, lat],
          zoom: 16,
        },
      });
      mapInstanceRef.current = map;

      map.addChild(new YMapDefaultSchemeLayer());
      map.addChild(new YMapDefaultFeaturesLayer());

      const markerEl = document.createElement("div");
      markerEl.setAttribute("aria-hidden", "true");
      Object.assign(markerEl.style, {
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        border: "2px solid white",
        backgroundColor: "var(--ember-400, #f97316)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      });
      map.addChild(new YMapMarker({ coordinates: [lon, lat] }, markerEl));
    });
  }, [latitude, longitude, apiKey]);

  const handleScriptLoad = useCallback(() => {
    // Отложенная инициализация: контейнер и ymaps3 готовы после следующего кадра
    requestAnimationFrame(() => {
      initMap();
    });
  }, [initMap]);

  useYandexMapCleanupHook(
    mapInstanceRef as React.MutableRefObject<{ destroy?: () => void } | null>
  );

  if (!apiKey) {
    return null;
  }

  const scriptUrl = `${YANDEX_MAPS_SCRIPT_BASE}&apikey=${encodeURIComponent(apiKey)}`;

  return (
    <>
      <Script
        src={scriptUrl}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div
        ref={containerRef}
        className={className}
        style={{ minHeight: 280, height: "100%" }}
        role="img"
        aria-label="Карта места проведения"
      />
    </>
  );
}

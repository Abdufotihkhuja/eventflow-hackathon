/**
 * Минимальные типы для Yandex Maps JavaScript API 2.1
 * https://yandex.ru/dev/maps/jsapi/doc/2.1/
 */
declare namespace ymaps {
  function ready(fn: () => void): void

  function geocode(
    query: string | number[],
    options?: { results?: number; boundedBy?: number[][]; strictBounds?: boolean }
  ): Promise<IGeocodeResult>

  interface IGeocodeResult {
    geoObjects: IGeoObjectCollection
  }

  interface IGeoObjectCollection {
    get(index: number): IGeoObject
    getLength(): number
  }

  interface IGeoObject {
    geometry: {
      getCoordinates(): number[]
    }
    properties: {
      get(key: string): unknown
      getAll(): Record<string, unknown>
    }
  }

  class Map {
    constructor(
      element: string | HTMLElement,
      state: { center: number[]; zoom: number },
      options?: Record<string, unknown>
    )
    container: IMapContainer
    geoObjects: IGeoObjectCollection
    events: IEventManager
    setCenter(center: number[], zoom?: number): void
    destroy(): void
  }

  interface IMapContainer {
    fitToViewport(): void
  }

  interface IEventManager {
    add(type: string, handler: (e: IEvent) => void): void
  }

  interface IEvent {
    get(name: string): unknown
  }

  class Placemark {
    constructor(
      geometry: number[],
      properties?: Record<string, unknown>,
      options?: Record<string, unknown>
    )
    events: IEventManager
  }

  class GeoObjectCollection {
    add(child: unknown): void
    remove(child: unknown): void
  }
}

declare global {
  interface Window {
    ymaps: typeof ymaps
  }
}

export {}

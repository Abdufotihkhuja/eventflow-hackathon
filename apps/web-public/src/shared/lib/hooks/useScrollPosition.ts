"use client";

import { useSyncExternalStore } from "react";

interface UseScrollPositionOptions {
  threshold?: number;
}

export interface UseScrollPositionReturn {
  scrollY: number;
  isAtTop: boolean;
}

// Храним текущее состояние в переменной для быстрого доступа
let scrollState: UseScrollPositionReturn = {
  scrollY: 0,
  isAtTop: true,
};

// Флаг инициализации
let isInitialized = false;

// Пустой снимок для server-side rendering (кэшируется по ссылке)
const emptySnapshot: UseScrollPositionReturn = {
  scrollY: 0,
  isAtTop: true,
};

// Множество подписчиков
const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  // Инициализируем состояние при первом подключении
  if (!isInitialized) {
    const currentScrollY = window.scrollY;
    scrollState = {
      scrollY: currentScrollY,
      isAtTop: currentScrollY <= 0,
    };
    isInitialized = true;
  }

  subscribers.add(callback);

  const handleScroll = (): void => {
    const currentScrollY = window.scrollY;
    scrollState = {
      scrollY: currentScrollY,
      isAtTop: currentScrollY <= 0,
    };
    subscribers.forEach((cb) => cb());
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    subscribers.delete(callback);
    window.removeEventListener("scroll", handleScroll);
  };
}

function getSnapshot(): UseScrollPositionReturn {
  if (typeof window === "undefined") {
    return emptySnapshot;
  }

  // Инициализируем при первом вызове на клиенте
  if (!isInitialized) {
    const currentScrollY = window.scrollY;
    scrollState = {
      scrollY: currentScrollY,
      isAtTop: currentScrollY <= 0,
    };
    isInitialized = true;
  }

  return scrollState;
}

function getServerSnapshot(): UseScrollPositionReturn {
  return emptySnapshot;
}

/**
 * Хок для отслеживания позиции прокрутки страницы без использования useEffect.
 * Использует useSyncExternalStore для оптимальной работы с SSR.
 *
 * @param threshold - Пороговое значение для определения статуса "в начале" (по умолчанию 0)
 * @returns Объект с полями: isAtTop (bool), scrollY (number)
 */
export function useScrollPosition({
  threshold = 0,
}: UseScrollPositionOptions = {}): UseScrollPositionReturn {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return {
    ...snapshot,
    isAtTop: snapshot.scrollY <= threshold,
  };
}

"use client";

import { useSyncExternalStore, useCallback } from "react";

export interface UseScrollProgressReturn {
  /** Прогресс прокрутки от 0 до 100 */
  progress: number;
  /** Текущая позиция scrollY */
  scrollY: number;
  /** Функция для прокрутки к началу страницы */
  scrollToTop: () => void;
}

// Состояние прогресса
let progressState: Omit<UseScrollProgressReturn, "scrollToTop"> = {
  progress: 0,
  scrollY: 0,
};

// Флаг инициализации
let isInitialized = false;

// Пустой снимок для SSR
const emptySnapshot: Omit<UseScrollProgressReturn, "scrollToTop"> = {
  progress: 0,
  scrollY: 0,
};

// Подписчики
const subscribers = new Set<() => void>();

function calculateProgress(): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return 0;
  }

  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollY = window.scrollY;
  const scrollableHeight = documentHeight - windowHeight;

  if (scrollableHeight <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (scrollY / scrollableHeight) * 100));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  // Инициализируем при первом подключении
  if (!isInitialized) {
    progressState = {
      progress: calculateProgress(),
      scrollY: window.scrollY,
    };
    isInitialized = true;
  }

  subscribers.add(callback);

  const handleScroll = (): void => {
    progressState = {
      progress: calculateProgress(),
      scrollY: window.scrollY,
    };
    subscribers.forEach((cb) => cb());
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  // Также слушаем resize для пересчёта при изменении размера окна
  window.addEventListener("resize", handleScroll, { passive: true });

  return () => {
    subscribers.delete(callback);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("resize", handleScroll);
  };
}

function getSnapshot(): Omit<UseScrollProgressReturn, "scrollToTop"> {
  if (typeof window === "undefined") {
    return emptySnapshot;
  }

  if (!isInitialized) {
    progressState = {
      progress: calculateProgress(),
      scrollY: window.scrollY,
    };
    isInitialized = true;
  }

  return progressState;
}

function getServerSnapshot(): Omit<UseScrollProgressReturn, "scrollToTop"> {
  return emptySnapshot;
}

/**
 * Хук для отслеживания прогресса прокрутки страницы.
 * Возвращает прогресс от 0 до 100 и функцию для прокрутки наверх.
 *
 * @returns Объект с progress (0-100), scrollY и scrollToTop
 */
export function useScrollProgress(): UseScrollProgressReturn {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const scrollToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, []);

  return {
    ...snapshot,
    scrollToTop,
  };
}

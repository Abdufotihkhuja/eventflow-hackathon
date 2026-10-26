"use client";

/**
 * Отправляет поисковые запросы каталога в аналитику. Дебаунс — чтобы не
 * стрелять на каждое нажатие клавиши.
 */

import { useEffect } from "react";

import { trackEvent } from "./track";

const SEARCH_DEBOUNCE_MS = 800;

export function useTrackSearch(searchTerm: string): void {
  // eslint-disable-next-line no-restricted-syntax -- дебаунс-таймер аналитики, инкапсулирован в кастомный хук
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) return;
    const id = setTimeout(
      () => trackEvent("search", { search_term: term }),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(id);
  }, [searchTerm]);
}

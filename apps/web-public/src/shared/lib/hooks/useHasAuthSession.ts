/**
 * SSR-безопасный признак «в браузере есть сессия».
 *
 * Нужен там, где компонент рендерится и для гостя, и для авторизованного:
 * запросы к защищённым эндпоинтам (например GET /api/v1/session/me) нельзя
 * запускать анонимно — они гарантированно вернут 401, а транспорт на 401
 * уводит на /login прямо с публичной страницы.
 *
 * useSyncExternalStore вместо useEffect: серверный снимок всегда false, поэтому
 * гидратация совпадает, а после первого клиентского рендера значение читается
 * из реального хранилища.
 */

import { useSyncExternalStore } from "react";

import { isAuthenticated } from "@shared/lib/apiClient";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  // Логин/логаут в соседней вкладке меняет localStorage — подхватываем его.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function useHasAuthSession(): boolean {
  return useSyncExternalStore(subscribe, isAuthenticated, () => false);
}

/**
 * @module shared/lib/hooks/usePortal
 * @description Хук для работы с React Portal
 */

"use client";

import { useEffect, useRef } from "react";

/**
 * Создает portal элемент для рендеринга вне основного DOM дерева
 */
export function usePortal(id = "portal-root"): HTMLElement | null {
  const portalRef = useRef<HTMLElement | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- Инфраструктурный хук для создания portal элемента
  useEffect(() => {
    // Ищем существующий portal элемент
    let portalElement = document.getElementById(id);

    // Если не найден, создаём новый
    if (!portalElement) {
      portalElement = document.createElement("div");
      portalElement.id = id;
      document.body.appendChild(portalElement);
    }

    portalRef.current = portalElement;

    return () => {
      // Не удаляем элемент при размонтировании, так как он может быть использован другими компонентами
    };
  }, [id]);

  return portalRef.current;
}

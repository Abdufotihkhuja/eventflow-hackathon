"use client";

import { useEffect } from "react";

/**
 * Переписывает заголовок вкладки на клиенте.
 *
 * Нужен там, где серверный `generateMetadata` не знает финального содержимого
 * страницы: например, 404-граница события, которая после гидрации может
 * догрузить закрытое событие от имени участника — заголовок «Событие не
 * найдено» в этот момент уже неверен.
 *
 * `undefined` оставляет серверный заголовок нетронутым.
 */
export function useDocumentTitle(title: string | undefined): void {
  // eslint-disable-next-line no-restricted-syntax -- инкапсулированный side-effect в кастомном хуке
  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);
}

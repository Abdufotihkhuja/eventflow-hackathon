/**
 * Хук для создания интервала с возможностью приостановки
 * Безопасный для SSR и автоматически очищается при размонтировании
 *
 * Это утилитарный хук, инкапсулирующий useEffect для переиспользования
 */

/* eslint-disable no-restricted-syntax */
import { useEffect, useRef } from "react";

/**
 * Хук для периодического выполнения колбэка
 * @param callback - функция для выполнения
 * @param delay - задержка в мс, null для приостановки
 */
export const useInterval = (
  callback: () => void,
  delay: number | null
): void => {
  const savedCallback = useRef<() => void>(callback);

  // Сохраняем актуальную версию колбэка
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Устанавливаем интервал
  useEffect(() => {
    // Не запускаем если delay === null
    if (delay === null) {
      return;
    }

    const tick = (): void => {
      savedCallback.current();
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
};

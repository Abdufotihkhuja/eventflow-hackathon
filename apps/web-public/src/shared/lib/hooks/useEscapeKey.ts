import { useSyncExternalStore } from "react";

interface UseEscapeKeyOptions {
  enabled: boolean;
  onEscape: () => void;
}

/**
 * Инкапсулированный listener для закрытия по Escape.
 * Вынесено из прикладных компонентов согласно правилам проекта.
 */
export function useEscapeKey({ enabled, onEscape }: UseEscapeKeyOptions): void {
  useSyncExternalStore(
    () => {
      if (!enabled) {
        return () => {};
      }

      const handleEscape = (e: KeyboardEvent): void => {
        if (e.key === "Escape") {
          onEscape();
        }
      };

      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    },
    () => 0,
    () => 0
  );
}

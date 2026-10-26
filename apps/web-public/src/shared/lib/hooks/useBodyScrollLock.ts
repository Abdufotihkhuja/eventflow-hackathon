import { useSyncExternalStore } from "react";

interface UseBodyScrollLockOptions {
  enabled: boolean;
}

/**
 * Инкапсулированный side-effect для блокировки скролла body.
 * Вынесено из прикладных компонентов согласно правилам проекта.
 */
export function useBodyScrollLock({ enabled }: UseBodyScrollLockOptions): void {
  useSyncExternalStore(
    () => {
      if (!enabled) {
        return () => {};
      }

      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = previous;
      };
    },
    () => 0,
    () => 0
  );
}

"use client";

import { useState } from "react";

/**
 * Хук для "инициализации от внешнего значения" без useEffect.
 * В проекте запрещён useEffect, поэтому значение берётся только на маунте.
 *
 * Если нужно форс-ресет при изменении внешнего значения — используйте `key`
 * на уровне компонента (ремоунт) или сделайте явный reset действием.
 */
export function useSyncedState<T>(externalValue: T): [T, (value: T) => void] {
  return useState<T>(externalValue);
}

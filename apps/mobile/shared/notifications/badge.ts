/**
 * Badge на иконке приложения (BL-15, MOBILE_IMPACT §6, OQ-28).
 *
 * Источник истины — сервер: killed-приложению правильную цифру приносит поле
 * `badge` самого Expo-payload (кода не требует). Здесь — только foreground-
 * синхронизация: применить число из unread-count-фетча и сбросить при
 * открытии инбокса.
 *
 * NOTE(OQ-28): целевая цифра — УЧАСТНИЧЕСКИЙ unread; пока участнического
 * инбокса нет, единственный серверный счётчик — организаторский
 * (`entities/notifications`), к нему и подключён `useAppBadgeSync` на
 * org-дашборде. С появлением `/me/notifications/unread-count` источник
 * переключается на него, этот модуль не меняется.
 */
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export async function setAppBadgeCount(count: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    /* badge is cosmetic — never surface an error for it */
  }
}

export function clearAppBadge(): Promise<void> {
  return setAppBadgeCount(0);
}

/** Применить серверный unread к иконке, как только фетч его принёс. */
export function useAppBadgeSync(count: number | undefined): void {
  useEffect(() => {
    if (typeof count === "number") void setAppBadgeCount(count);
  }, [count]);
}

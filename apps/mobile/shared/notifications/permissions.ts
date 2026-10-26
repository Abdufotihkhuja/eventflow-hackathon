/**
 * Permission flow пушей (BL-15, MOBILE_IMPACT §2).
 *
 * Три состояния, которые различает UI:
 *   • `undetermined` — системный диалог ещё не показывали: prime-экран может
 *     звать `requestPermission()`;
 *   • `provisional` (iOS) — тихая доставка в Notification Center уже легальна
 *     (OQ-30: запрашивается при первом запуске без диалога), prime-экран
 *     апгрейдит до полного разрешения;
 *   • `denied` — системный диалог исчерпан: единственный путь —
 *     `Linking.openSettings()` (паттерн сканера, org/scan.tsx).
 *
 * Android 13+ — runtime `POST_NOTIFICATIONS` тем же `requestPermissionsAsync`;
 * на Android <13 система отвечает granted без диалога.
 */
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { syncDeviceRegistration } from "./device-token";

export type NotificationPermissionState =
  | "unknown" // ещё читаем из системы
  | "undetermined"
  | "provisional"
  | "granted"
  | "denied";

function toState(perm: Notifications.NotificationPermissionsStatus): NotificationPermissionState {
  if (
    Platform.OS === "ios" &&
    perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return "provisional";
  }
  if (perm.granted) return "granted";
  if (perm.status === "undetermined" || perm.canAskAgain) return "undetermined";
  return "denied";
}

/**
 * iOS provisional при первом запуске (дефолт OQ-30): диалога НЕ показывает,
 * но REM/REG начинают тихо приходить до решения пользователя. Android — no-op
 * (там provisional нет, а диалог без prime-экрана запрещён §2).
 */
export async function requestProvisionalPermission(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status !== "undetermined") return;
    const next = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: true },
    });
    if (toState(next) !== "denied") void syncDeviceRegistration("provisional-granted");
  } catch {
    /* permission probe is best-effort */
  }
}

/**
 * Хук для prime-экрана и экрана настроек уведомлений: текущее состояние +
 * полный (не provisional) запрос + дорога в системные настройки при denied.
 */
export function useNotificationPermission(): {
  state: NotificationPermissionState;
  /** Полный системный диалог. Возвращает состояние ПОСЛЕ ответа пользователя. */
  requestPermission: () => Promise<NotificationPermissionState>;
  openSystemSettings: () => void;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<NotificationPermissionState>("unknown");

  const refresh = useCallback(async () => {
    if (Platform.OS === "web") {
      setState("denied");
      return;
    }
    try {
      setState(toState(await Notifications.getPermissionsAsync()));
    } catch {
      setState("unknown");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (Platform.OS === "web") return "denied";
    try {
      const next = toState(
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        }),
      );
      setState(next);
      if (next === "granted" || next === "provisional") {
        void syncDeviceRegistration("permission-granted");
      }
      return next;
    } catch {
      return state;
    }
  }, [state]);

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings().catch(() => undefined);
  }, []);

  return { state, requestPermission, openSystemSettings, refresh };
}

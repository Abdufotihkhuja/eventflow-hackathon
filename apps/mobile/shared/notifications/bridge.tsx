/**
 * NotificationsBridge — единственная точка, где push-ядро встречается с
 * жизнью приложения (BL-15). Монтируется в root layout РЯДОМ со Stack (т.е.
 * только когда навигатор уже существует) и ничего не рендерит.
 *
 * Обязанности:
 *   • регистрация каналов Android на старте (и заново при смене языка —
 *     имена каналов локализованы);
 *   • iOS provisional-запрос при первом запуске (OQ-30, диалога нет);
 *   • cold start: `getLastNotificationResponseAsync` строго ПОСЛЕ того, как
 *     сессия восстановлена (`status`/`workspaceRestoring` — тот же сигнал,
 *     которого ждут index.tsx и useWorkspaceGate) — иначе навигация стреляет
 *     до готовности роутера/workspace и организатора выбрасывает в ленту;
 *   • background → тап: `addNotificationResponseReceivedListener` → та же
 *     навигационная функция; обработанные response-id запоминаются, повторная
 *     навигация при remount исключена;
 *   • foreground: входящий пуш → инвалидация счётчиков инбокса (баннер решает
 *     `handler.ts`).
 */
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { queryClient } from "@shared/api";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";

import { ensureAndroidChannels } from "./channels";
import { requestProvisionalPermission } from "./permissions";
import { resolvePushTarget, type PushPayloadData } from "./resolve-target";
import type { PushShell } from "./known-routes";

/** Response-id уже отработанных тапов — защита от повторной навигации, когда
 *  cold-start-обработка и live-listener видят один и тот же response. */
const handledResponses = new Set<string>();

function invalidateInboxCounters(): void {
  // Литералы зеркалят `notificationKeys.all` (entities/notifications) и
  // `accountNotificationKeys.all` (entities/account-notifications): слой
  // shared не импортирует entities (FSD), а ключи — часть контракта инбоксов.
  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  void queryClient.invalidateQueries({ queryKey: ["account-notifications"] });
}

export function NotificationsBridge(): null {
  const { status, workspaceRestoring, workspace, exitWorkspace } = useAuth();
  const { t } = useI18n();
  const sessionReady = status !== "loading" && !workspaceRestoring;
  const coldStartDone = useRef(false);

  // Листенеры живут дольше, чем один render — актуальный шелл и exitWorkspace
  // читаются через ref, чтобы не пересоздавать подписки на каждую смену сессии.
  const shellRef = useRef<PushShell>("participant");
  shellRef.current = workspace ? "org" : "participant";
  const exitWorkspaceRef = useRef(exitWorkspace);
  exitWorkspaceRef.current = exitWorkspace;

  useEffect(() => {
    if (Platform.OS === "web") return;
    void ensureAndroidChannels(t);
  }, [t]);

  useEffect(() => {
    void requestProvisionalPermission();
  }, []);

  const navigateFromResponse = useCallback(
    async (response: Notifications.NotificationResponse): Promise<void> => {
      const id = response.notification.request.identifier;
      if (handledResponses.has(id)) return;
      handledResponses.add(id);

      const data = response.notification.request.content.data as PushPayloadData | undefined;
      const target = resolvePushTarget(data, { shell: shellRef.current });

      // Участнический экран под org-scoped токеном отдаст 403 — сперва выходим
      // из workspace (личная сессия в стэше, exitWorkspace её восстанавливает).
      if (target.requiresPersonalSession) {
        try {
          await exitWorkspaceRef.current();
        } catch {
          /* даже если выход не удался, навигация ниже упрётся в гейт, не в крэш */
        }
      }
      try {
        router.push({ pathname: target.pathname, params: target.params } as never);
      } catch {
        /* роутер ещё не готов — уведомление просто открывает приложение */
      }
      // Тап по пушу почти всегда меняет состояние инбокса — освежаем счётчики.
      invalidateInboxCounters();
    },
    [],
  );

  // Killed → тап по пушу: однократно, строго после восстановления сессии.
  useEffect(() => {
    if (!sessionReady || coldStartDone.current || Platform.OS === "web") return;
    coldStartDone.current = true;
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) void navigateFromResponse(response);
      })
      .catch(() => undefined);
  }, [sessionReady, navigateFromResponse]);

  // Background/foreground live-подписки.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const tap = Notifications.addNotificationResponseReceivedListener((response) => {
      void navigateFromResponse(response);
    });
    const incoming = Notifications.addNotificationReceivedListener(() => {
      invalidateInboxCounters();
    });
    return () => {
      tap.remove();
      incoming.remove();
    };
  }, [navigateFromResponse]);

  return null;
}

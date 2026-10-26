/**
 * Foreground-политика показа пушей (BL-15, MOBILE_IMPACT §8).
 *
 * Пока приложение на экране:
 *   • transactional / reminders — показываем баннер (без звука: пользователь
 *     и так в приложении, звук поверх работы — шум);
 *   • updates (informational) — тихо: баннера нет, только запись в шторке и
 *     обновление счётчиков инбокса (инвалидация — в bridge).
 *
 * Badge здесь не трогаем: цифру на иконке несёт сам Expo-payload с сервера
 * (источник истины), а foreground-синхронизация идёт через `badge.ts`.
 *
 * TODO(после BL-25): подавлять баннер для событий ТЕКУЩЕГО экрана («новая
 * регистрация», когда открыт список участников) — нужен доступ к активному
 * маршруту, подключим вместе с реальным трафиком пушей.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { resolvePushChannel, type PushPayloadData } from "./resolve-target";

export function installNotificationHandler(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: (notification) => {
      const channel = resolvePushChannel(
        notification.request.content.data as PushPayloadData | undefined,
      );
      const banner = channel !== "updates";
      return Promise.resolve({
        shouldShowBanner: banner,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      });
    },
  });
}

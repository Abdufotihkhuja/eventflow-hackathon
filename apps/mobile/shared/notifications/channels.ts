/**
 * Каналы уведомлений Android (BL-15). Регистрируются на каждом старте — вызов
 * идемпотентен, а повторная регистрация освежает локализованное имя канала
 * после смены языка интерфейса.
 *
 * Маппинг важности — из контент-контракта каталога:
 *   transactional — HIGH (билет, статус заявки, модерация: баннер всегда)
 *   reminders     — HIGH + звук (напоминания перед началом)
 *   updates       — DEFAULT (informational: тихо, без баннера в foreground)
 *
 * На Android <13 разрешение неявное, но каналы регистрируем всегда; на iOS и
 * web вызов — no-op.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { PushChannel } from "./resolve-target";

type Translate = (key: "notifChannel.transactional" | "notifChannel.reminders" | "notifChannel.updates") => string;

export async function ensureAndroidChannels(t: Translate): Promise<void> {
  if (Platform.OS !== "android") return;
  const defs: { id: PushChannel; name: string; channel: Notifications.NotificationChannelInput }[] = [
    {
      id: "transactional",
      name: t("notifChannel.transactional"),
      channel: { name: "", importance: Notifications.AndroidImportance.HIGH },
    },
    {
      id: "reminders",
      name: t("notifChannel.reminders"),
      channel: { name: "", importance: Notifications.AndroidImportance.HIGH, sound: "default" },
    },
    {
      id: "updates",
      name: t("notifChannel.updates"),
      channel: { name: "", importance: Notifications.AndroidImportance.DEFAULT },
    },
  ];
  await Promise.all(
    defs.map(({ id, name, channel }) =>
      Notifications.setNotificationChannelAsync(id, { ...channel, name }).catch(() => null),
    ),
  );
}

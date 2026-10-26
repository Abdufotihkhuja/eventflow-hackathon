/**
 * Регистрация устройства на сервере (BL-25).
 *
 * Идентичность устройства — `installationId` (uuid в SecureStore
 * `ef.installation`): генерируется однажды и ПЕРЕЖИВАЕТ logout, поэтому
 * `PUT /me/devices/{installationId}` остаётся идемпотентным upsert'ом на все
 * случаи сразу — повторный login, ротация Expo-токена, смена локали.
 * Call-sites расставлены по жизненному циклу ещё в BL-15 (grant permission,
 * login, enterWorkspace, смена языка — auth-context, permissions.ts,
 * language-sheet) и этим модулем не трогаются.
 *
 * Деградация — всегда тихая: без `extra.eas.projectId` (credentials Expo Push
 * Service ещё не выданы — BL-12/OQ-13) пуш-токен получить нельзя, и sync
 * превращается в dev-warning; сетевые ошибки не роняют вызвавший флоу —
 * следующий lifecycle-sync повторит PUT.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import { accountSdk, tokenStore } from "@shared/api";
import { getPersistedLang } from "@shared/i18n";

import type { Lang } from "@shared/data/events";

const INSTALLATION_KEY = "ef.installation";

export interface DeviceTokenMeta {
  platform: "ios" | "android";
  /** Язык интерфейса — сервер локализует killed-push по записи токена. */
  locale: Lang;
}

/** Почему регистрацию дёрнули — для dev-логов деградации. */
export type DeviceSyncReason =
  | "provisional-granted"
  | "permission-granted"
  | "login"
  | "enter-workspace"
  | "locale-changed";

function devWarn(message: string): void {
  if (__DEV__) console.warn(`[notifications] ${message}`);
}

/** RFC 4122 v4. Hermes не гарантирует `crypto.randomUUID`, а тянуть зависимость
 *  ради одного идентификатора установки незачем — фолбэк на `Math.random`
 *  здесь достаточен: id должен быть лишь уникален среди устройств аккаунта. */
function uuidv4(): string {
  const g = globalThis.crypto as
    | { randomUUID?: () => string; getRandomValues?: (b: Uint8Array) => Uint8Array }
    | undefined;
  if (g?.randomUUID) return g.randomUUID();
  const bytes = new Uint8Array(16);
  if (g?.getRandomValues) g.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

let cachedInstallationId: string | null = null;

async function getInstallationId(): Promise<string> {
  if (cachedInstallationId) return cachedInstallationId;
  try {
    const existing = await SecureStore.getItemAsync(INSTALLATION_KEY);
    if (existing) {
      cachedInstallationId = existing;
      return existing;
    }
  } catch {
    /* keychain-сбой → свежий id ниже; сервер догасит осиротевшую запись */
  }
  const id = uuidv4();
  cachedInstallationId = id;
  try {
    await SecureStore.setItemAsync(INSTALLATION_KEY, id);
  } catch {
    /* best-effort: id доживёт хотя бы до перезапуска */
  }
  return id;
}

async function currentMeta(): Promise<DeviceTokenMeta> {
  return {
    platform: Platform.OS === "android" ? "android" : "ios",
    locale: await getPersistedLang(),
  };
}

/** granted ИЛИ iOS provisional (тихая доставка уже легальна — permissions.ts). */
async function hasPushPermission(): Promise<boolean> {
  const perm = await Notifications.getPermissionsAsync();
  return (
    perm.granted ||
    perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/** PUT /me/devices/{installationId} — идемпотентный upsert (204). */
export async function registerDeviceToken(token: string, meta: DeviceTokenMeta): Promise<void> {
  const installationId = await getInstallationId();
  // `as never` на границе SDK: контракт типизирует platform/locale генерённым
  // TS-enum'ом, куда литералы не присваиваются (паттерн org-events/mutations).
  await accountSdk.devices.registerDevice(installationId, {
    expoPushToken: token,
    platform: meta.platform,
    locale: meta.locale,
    appVersion: Constants.expoConfig?.version,
  } as never);
}

/**
 * DELETE /me/devices/{installationId} — вызывается ДО чистки сессии (DELETE
 * требует живого токена). Никогда не бросает: сетевая ошибка не должна
 * блокировать logout — сервер догасит токен по push-receipts. `installationId`
 * НЕ удаляется: это идентичность установки, а не сессии.
 */
export async function unregisterDeviceToken(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const installationId =
      cachedInstallationId ?? (await SecureStore.getItemAsync(INSTALLATION_KEY).catch(() => null));
    if (!installationId) return; // устройство ни разу не регистрировалось
    await accountSdk.devices.removeDevice(installationId);
  } catch {
    devWarn("unregisterDeviceToken failed — server expires the token via receipts");
  }
}

let rotationListenerInstalled = false;

/** Ротация Expo-токена (например, восстановление из бэкапа): тот же PUT-upsert
 *  с новым токеном под прежним installationId. Ставится один раз — при первом
 *  sync, т.е. только когда projectId уже есть и регистрация вообще возможна. */
function ensureRotationListener(): void {
  if (rotationListenerInstalled) return;
  rotationListenerInstalled = true;
  Notifications.addPushTokenListener((token) => {
    void (async () => {
      try {
        await registerDeviceToken(token.data, await currentMeta());
      } catch {
        devWarn("push token rotation PUT failed — next lifecycle sync retries");
      }
    })();
  });
}

/**
 * Оркестратор «есть разрешение → добудь Expo-токен → зарегистрируй».
 * Никогда не бросает — call-sites зовут его fire-and-forget из login/языка,
 * и оффлайн не имеет права ронять эти флоу.
 */
export async function syncDeviceRegistration(reason: DeviceSyncReason): Promise<void> {
  if (Platform.OS === "web") return; // web-пушей нет (BL-15)
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
    ?.eas?.projectId;
  if (!projectId) {
    devWarn(`syncDeviceRegistration(${reason}) skipped — no extra.eas.projectId (BL-12)`);
    return;
  }
  try {
    // Без сессии PUT нечем подписать (welcome-экран, смена языка до логина) —
    // регистрацию доделает sync("login").
    if (!(await tokenStore.getAccess())) return;
    if (!(await hasPushPermission())) return;
    ensureRotationListener();
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    // Мету читаем ПОСЛЕ похода за токеном: к этому моменту `saveLang` после
    // смены языка уже дописал новое значение в SecureStore.
    await registerDeviceToken(token.data, await currentMeta());
  } catch {
    devWarn(`syncDeviceRegistration(${reason}) failed — next lifecycle sync retries`);
  }
}

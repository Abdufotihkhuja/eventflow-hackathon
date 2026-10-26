/**
 * Device-token lifecycle (BL-25): что здесь хрупкого.
 *
 * `syncDeviceRegistration` зовётся fire-and-forget из login, enterWorkspace и
 * смены языка — если он бросит или повиснет, падает сам флоу входа. Поэтому
 * закрепляем деградацию: без `extra.eas.projectId` (BL-12 ещё не выдал
 * credentials) — тихий no-op; без сессии — no-op; сетевая ошибка PUT — no-op с
 * ретраем при следующем sync. Плюс идентичность установки: `installationId`
 * генерируется один раз и не меняется между вызовами.
 */
import Constants from "expo-constants";

import { syncDeviceRegistration, unregisterDeviceToken } from "@shared/notifications/device-token";

// Фабрика мока НЕ ссылается на внешнюю константу: jest.mock хоистится и
// исполняется при импорте модуля — раньше, чем инициализируются const'ы файла.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.2.3", extra: {} as Record<string, unknown> } },
}));

const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

const mockGetPermissions = jest.fn(async (): Promise<unknown> => ({ granted: true }));
const mockGetExpoToken = jest.fn(async (_args: unknown) => ({ data: "ExponentPushToken[test]" }));
const mockAddPushTokenListener = jest.fn((_cb: unknown) => ({ remove: jest.fn() }));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: () => mockGetPermissions(),
  getExpoPushTokenAsync: (args: unknown) => mockGetExpoToken(args as never),
  addPushTokenListener: (cb: unknown) => mockAddPushTokenListener(cb as never),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const mockRegisterDevice = jest.fn(async (_id: unknown, _body: unknown): Promise<void> => undefined);
const mockRemoveDevice = jest.fn(async (_id: unknown): Promise<void> => undefined);
const mockGetAccess = jest.fn(async (): Promise<string | null> => "jwt");
jest.mock("@shared/api", () => ({
  accountSdk: {
    devices: {
      registerDevice: (id: string, body: unknown) => mockRegisterDevice(id as never, body as never),
      removeDevice: (id: string) => mockRemoveDevice(id as never),
    },
  },
  tokenStore: { getAccess: () => mockGetAccess() },
}));

jest.mock("@shared/i18n", () => ({ getPersistedLang: async () => "ru" }));

const mockConstants = Constants as unknown as {
  expoConfig: { version: string; extra: Record<string, unknown> };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeAll(() => {
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

beforeEach(() => {
  mockRegisterDevice.mockClear();
  mockRemoveDevice.mockClear();
  mockGetExpoToken.mockClear();
  mockGetAccess.mockResolvedValue("jwt");
  mockGetPermissions.mockResolvedValue({ granted: true });
});

describe("syncDeviceRegistration", () => {
  it("degrades silently when extra.eas.projectId is absent (BL-12 not delivered)", async () => {
    mockConstants.expoConfig.extra = {};

    await expect(syncDeviceRegistration("login")).resolves.toBeUndefined();

    expect(mockGetExpoToken).not.toHaveBeenCalled();
    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it("skips without a session — welcome-screen language change must not fire a 401 PUT", async () => {
    mockConstants.expoConfig.extra = { eas: { projectId: "proj-1" } };
    mockGetAccess.mockResolvedValue(null);

    await expect(syncDeviceRegistration("locale-changed")).resolves.toBeUndefined();

    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it("PUTs the token with platform/locale/appVersion and a stable installation uuid", async () => {
    mockConstants.expoConfig.extra = { eas: { projectId: "proj-1" } };

    await syncDeviceRegistration("login");
    await syncDeviceRegistration("enter-workspace");

    expect(mockGetExpoToken).toHaveBeenCalledWith({ projectId: "proj-1" });
    expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    const [firstId, body] = mockRegisterDevice.mock.calls[0] as unknown as [string, unknown];
    const [secondId] = mockRegisterDevice.mock.calls[1] as unknown as [string];
    expect(firstId).toMatch(UUID_RE);
    // Один uuid на установку — иначе каждый login плодил бы «новое устройство».
    expect(secondId).toBe(firstId);
    expect(body).toEqual({
      expoPushToken: "ExponentPushToken[test]",
      platform: "ios",
      locale: "ru",
      appVersion: "1.2.3",
    });
  });

  it("swallows a network failure and retries on the next lifecycle sync", async () => {
    mockConstants.expoConfig.extra = { eas: { projectId: "proj-1" } };
    mockRegisterDevice.mockRejectedValueOnce(new Error("offline"));

    await expect(syncDeviceRegistration("login")).resolves.toBeUndefined();
    await syncDeviceRegistration("enter-workspace");

    expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
  });

  it("does nothing while permission is denied", async () => {
    mockConstants.expoConfig.extra = { eas: { projectId: "proj-1" } };
    mockGetPermissions.mockResolvedValue({ granted: false, status: "denied" });

    await syncDeviceRegistration("login");

    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });
});

describe("unregisterDeviceToken", () => {
  it("DELETEs the same installation id and keeps it for the next login", async () => {
    const storedBefore = mockStore.get("ef.installation");
    expect(storedBefore).toMatch(UUID_RE);

    await unregisterDeviceToken();

    expect(mockRemoveDevice).toHaveBeenCalledWith(storedBefore);
    // Идентичность установки переживает logout — id не удаляется.
    expect(mockStore.get("ef.installation")).toBe(storedBefore);
  });

  it("never throws on a network failure — logout must not be blocked", async () => {
    mockRemoveDevice.mockRejectedValueOnce(new Error("offline"));

    await expect(unregisterDeviceToken()).resolves.toBeUndefined();
  });
});

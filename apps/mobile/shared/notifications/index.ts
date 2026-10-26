/**
 * `shared/notifications` — push-ядро (BL-15).
 *
 * ЕДИНСТВЕННОЕ место, импортирующее `expo-notifications` (правило по образцу
 * «AsyncStorage запрещён» в token-store.ts): экраны и фичи работают только
 * через эти экспорты, чтобы permission-политика, каналы и навигация по payload
 * не расползлись по приложению.
 */
export { NotificationsBridge } from "./bridge";
export { installNotificationHandler } from "./handler";
export {
  KNOWN_PUSH_ROUTES,
  ORG_FALLBACK_ROUTE,
  PARTICIPANT_FALLBACK_ROUTE,
  type KnownPushRouteName,
  type PushShell,
} from "./known-routes";
export {
  resolvePushChannel,
  resolvePushTarget,
  type PushChannel,
  type PushPayloadData,
  type PushTarget,
} from "./resolve-target";
export {
  requestProvisionalPermission,
  useNotificationPermission,
  type NotificationPermissionState,
} from "./permissions";
export { clearAppBadge, setAppBadgeCount, useAppBadgeSync } from "./badge";
export {
  registerDeviceToken,
  syncDeviceRegistration,
  unregisterDeviceToken,
  type DeviceSyncReason,
  type DeviceTokenMeta,
} from "./device-token";

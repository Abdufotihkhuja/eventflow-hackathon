/**
 * Thin haptics wrapper. Tactile feedback on key actions is a 2026 baseline; this
 * centralizes intent (`tap`/`select`/`success`/`warn`/`error`) and no-ops on web
 * so screens can call it unconditionally.
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const on = Platform.OS === "ios" || Platform.OS === "android";

export const haptics = {
  tap: () => on && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  press: () => on && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  select: () => on && void Haptics.selectionAsync().catch(() => {}),
  success: () => on && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => on && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  error: () => on && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

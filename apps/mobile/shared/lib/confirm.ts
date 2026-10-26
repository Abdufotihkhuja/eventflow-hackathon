/**
 * Cross-platform confirmation dialog.
 *
 * `Alert.alert` with custom buttons is a no-op on react-native-web (the button
 * `onPress` never fires), so any web build of the app couldn't confirm a logout,
 * a registration cancel, etc. This helper uses the native `Alert` on iOS/Android
 * and the browser's `confirm()` on web so the action always runs.
 */
import { Alert, Platform } from "react-native";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function confirm({
  title,
  message,
  confirmText,
  cancelText,
  destructive,
  onConfirm,
}: ConfirmOptions): void {
  if (Platform.OS === "web") {
    const ok = globalThis.confirm
      ? globalThis.confirm(message ? `${title}\n\n${message}` : title)
      : true;
    if (ok) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    {
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}

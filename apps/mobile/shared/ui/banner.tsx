/**
 * Banner — a compact inline status banner (the design's `NetBanner`), used for
 * auth errors and the occasional info notice. Icon + message, with an optional
 * trailing action (e.g. "Retry").
 *
 * Mount/unmount animates (bannerIn/Out recipe) and the message is announced
 * to screen readers via a polite live region; the trailing action keeps a
 * ≥44px touch target through hitSlop without inflating the banner.
 */
import { Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";

import { bannerIn, bannerOut } from "@shared/motion";
import { radii, type, usePalette } from "@shared/theme";

import { Icon } from "./icon";

type Tone = "danger" | "info" | "success";

export function Banner({
  children,
  tone = "danger",
  action,
  onAction,
}: {
  children: React.ReactNode;
  tone?: Tone;
  action?: string;
  onAction?: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const map: Record<Tone, { bg: string; fg: string; icon: string }> = {
    danger: { bg: p.dangerSoft, fg: p.dangerSoftFg, icon: "alert" },
    info: { bg: p.infoSoft, fg: p.info, icon: "info" },
    success: { bg: p.forestSoft, fg: p.forestSoftFg, icon: "check" },
  };
  const m = map[tone];
  return (
    <Animated.View
      entering={bannerIn()}
      exiting={bannerOut()}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: 13,
        borderRadius: radii.control,
        backgroundColor: m.bg,
      }}
    >
      <Icon name={m.icon} size={18} color={m.fg} />
      <Text style={[type({ weight: 600, size: 13, leading: 1.3, color: m.fg }), { flex: 1 }]}>{children}</Text>
      {action ? (
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
          accessibilityRole="button"
        >
          <Text style={type({ weight: 700, size: 12, leading: 1, color: m.fg })}>{action}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

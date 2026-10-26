/**
 * FootLink — the design's centered auth footer link: a muted question followed
 * by an ember action ("Already have an account?  Log in"). The whole line is one
 * tap target. Used at the bottom of sign-up / log-in / intent / forgot.
 */
import { Pressable, Text } from "react-native";

import { accent, type, usePalette } from "@shared/theme";

export function FootLink({
  children,
  action,
  onPress,
}: {
  children: React.ReactNode;
  action: string;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => ({ alignSelf: "center", paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={type({ weight: 400, size: 13, leading: 1.5, color: p.fgMuted, align: "center" })}>
        {children}{" "}
        <Text style={type({ weight: 700, size: 13, leading: 1.5, color: p.isDark ? accent.bright : accent.ink })}>{action}</Text>
      </Text>
    </Pressable>
  );
}

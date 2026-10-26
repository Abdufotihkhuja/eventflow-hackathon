/**
 * Avatar — a flat initials disc. A real photo (`src`) replaces the monogram.
 *
 * The `hue` prop is kept because call sites all over the app already seed it
 * from an id, but it no longer paints an HSL gradient: it only picks one of a
 * few brand tones. The gradient version produced arbitrary colours (a neon
 * green "AK" disc on Discover, for one) that exist in no ramp, and gradients as
 * decoration are banned by DESIGN.md.
 */
import { Image, Text, View } from "react-native";

import { bone, ember, forest, ink } from "@eventflow/ui-tokens";

import { accent, radii, type, usePalette } from "@shared/theme";

/** Identity tones — ink-led, with ember and forest as the two accents. Small on
 *  purpose: initials should read as one system, not a colour wheel. */
const TONES: readonly { bg: string; fg: string }[] = [
  { bg: ink[400], fg: bone[100] },
  { bg: ink[200], fg: bone[100] },
  { bg: forest[400], fg: bone[100] },
  { bg: ember[400], fg: bone[50] },
  { bg: bone[300], fg: ink[400] },
  { bg: forest[200], fg: forest[600] },
  { bg: ember[100], fg: ember[600] },
] as const;

export function Avatar({
  initials, size = 40, hue = 22, ring, src,
}: {
  initials: string;
  size?: number;
  /** Identity seed. Only selects a brand tone — never used as an HSL angle. */
  hue?: number;
  ring?: boolean;
  /** Real profile photo — replaces the monogram when set. */
  src?: string;
}): React.JSX.Element {
  const p = usePalette();
  const tone = TONES[Math.abs(Math.round(hue)) % TONES.length] as { bg: string; fg: string };
  return (
    <View
      style={
        ring
          ? {
              padding: 2.5, borderRadius: radii.pill, backgroundColor: accent.base,
              borderWidth: 2, borderColor: p.canvas,
            }
          : undefined
      }
    >
      {src ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size, borderRadius: radii.pill }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: size, height: size, borderRadius: radii.pill, backgroundColor: tone.bg,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={type({ role: "display", weight: 700, size: Math.round(size * 0.36), leading: 1.2, track: -0.02, color: tone.fg })}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
}

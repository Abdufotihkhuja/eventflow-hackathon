/**
 * OrgBadge — square organization mark (design `org-switch.jsx` §1.3).
 * Orgs are SQUARES (r12; r7 at the 24px ModePill size), people are circles
 * (`Avatar`) — keep the distinction. `hue` seeds a brand tone exactly the way
 * `Avatar` does (never an HSL angle); optional `src` renders a real logo.
 */
import { Image, Text, View } from "react-native";

import { bone, ember, forest, ink } from "@eventflow/ui-tokens";

import { radii, type } from "@shared/theme";

/** Same identity set as `Avatar`, so a person and their org read as one system.
 *  `onDark` says whether the tone is a DARK ground — surfaces larger than a
 *  badge (the public page's cover band) need it to pick their status-bar style
 *  and their glass controls. */
export interface OrgTone {
  bg: string;
  fg: string;
  onDark: boolean;
}

const TONES: readonly OrgTone[] = [
  { bg: ink[400], fg: bone[100], onDark: true },
  { bg: ink[200], fg: bone[100], onDark: true },
  { bg: forest[400], fg: bone[100], onDark: true },
  { bg: ember[400], fg: bone[50], onDark: true },
  { bg: bone[300], fg: ink[400], onDark: false },
  { bg: forest[200], fg: forest[600], onDark: false },
  { bg: ember[100], fg: ember[600], onDark: false },
] as const;

/** The brand tone for an organization id-seed. Exported so a page can dress a
 *  whole band in the SAME colour as the org's mark — one identity per org,
 *  rather than a badge in one colour and a cover in another. */
export function orgTone(hue: number): OrgTone {
  return TONES[Math.abs(Math.round(hue)) % TONES.length] as OrgTone;
}

/** First letter of up to two words of the org name (guarding empties). */
function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((w) => w[0]).join("");
  return initials || "•";
}

export function OrgBadge({
  name,
  hue = 22,
  size = 44,
  radius,
  src,
}: {
  name: string;
  /** Identity seed. Only selects a brand tone — never used as an HSL angle. */
  hue?: number;
  size?: number;
  /** Corner radius override; defaults to 12 (7 when size ≤ 24 — ModePill). */
  radius?: number;
  /** Real logo URL — replaces the monogram when provided. */
  src?: string;
}): React.JSX.Element {
  const r = radius ?? (size <= 24 ? 7 : radii.control);
  const tone = orgTone(hue);

  if (src) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, overflow: "hidden", flexShrink: 0 }}>
        <Image source={{ uri: src }} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: r, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={type({ role: "display", weight: 700, size: Math.round(size * 0.34), leading: 1.2, track: -0.02, color: tone.fg })}
      >
        {orgInitials(name)}
      </Text>
    </View>
  );
}

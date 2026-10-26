/**
 * Font system. React Native loads one family per weight, so the design's
 * `font-weight` axis maps to discrete loaded families. `font(family, weight)`
 * resolves a (role, weight) pair to the right RN `fontFamily` string and is the
 * only way the UI references type — no raw family strings in components.
 *
 *   Manrope        → body / UI (`sans`)     400 500 600 700 800
 *   Space Grotesk  → display / numerals     300 400 500 600 700
 *   JetBrains Mono → metadata / codes       400 500 600 700
 */
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";

export type FontRole = "sans" | "display" | "mono";
export type FontWeight = 300 | 400 | 500 | 600 | 700 | 800;

const MAP: Record<FontRole, Partial<Record<FontWeight, string>>> = {
  sans: {
    400: "Manrope_400Regular",
    500: "Manrope_500Medium",
    600: "Manrope_600SemiBold",
    700: "Manrope_700Bold",
    800: "Manrope_800ExtraBold",
  },
  display: {
    400: "SpaceGrotesk_400Regular",
    500: "SpaceGrotesk_500Medium",
    600: "SpaceGrotesk_600SemiBold",
    700: "SpaceGrotesk_700Bold",
  },
  mono: {
    400: "JetBrainsMono_400Regular",
    500: "JetBrainsMono_500Medium",
    600: "JetBrainsMono_600SemiBold",
    700: "JetBrainsMono_700Bold",
  },
};

const ORDER: FontWeight[] = [300, 400, 500, 600, 700, 800];

// Space Grotesk (the display face) has no Cyrillic glyphs, so Russian display
// text would fall back to an ugly serif. For Cyrillic locales we render display
// text in Manrope (geometric-humanist, full Cyrillic) instead — set by the i18n
// provider. Latin locales (uz/en) keep Space Grotesk.
let displayUsesCyrillic = false;
export function setDisplayScriptCyrillic(cyrillic: boolean): void {
  displayUsesCyrillic = cyrillic;
}

/** Resolve a role + weight to a loaded RN font family, clamping to the nearest available weight. */
export function font(role: FontRole = "sans", weight: FontWeight = 400): string {
  if (role === "display" && displayUsesCyrillic) role = "sans";
  const table = MAP[role];
  if (table[weight]) return table[weight] as string;
  // Walk outward from the requested weight to the closest defined one.
  const idx = ORDER.indexOf(weight);
  for (let d = 1; d < ORDER.length; d++) {
    const lo = ORDER[idx - d];
    const hi = ORDER[idx + d];
    if (lo != null && table[lo]) return table[lo] as string;
    if (hi != null && table[hi]) return table[hi] as string;
  }
  return table[400] ?? "Manrope_400Regular";
}

/** Load every weight used across the app. Returns `[loaded, error]`. */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });
}

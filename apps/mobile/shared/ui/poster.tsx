/**
 * Event posters. Two surfaces, one visual language:
 *
 *   `EventPoster` — the editorial **date plate** used by cards and heroes. A
 *   large day numeral in the display face, a mono eyebrow, hairline rules and a
 *   single ember tick. No imagery is invented: the plate states the one fact a
 *   poster should state.
 *
 *   `PosterArt` — a small flat **mark** for thumbnails and pickers, where a date
 *   plate would be illegible. Same palette, geometric, no type.
 *
 * Both draw from a fixed set of brand moods chosen deterministically from the
 * event id. Earlier versions seeded an HSL hue from that id (`hash % 360`),
 * which walked the whole colour wheel and put indigo/violet gradients on the
 * feed — off-palette, and banned outright by DESIGN.md. Colour here can only
 * ever come from the bone/ink/ember/forest ramps.
 */
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { bone, ember, forest, ink } from "@eventflow/ui-tokens";

import { useI18n } from "@shared/i18n";
import { stripWeekday } from "@shared/lib/format";
import { radii, type } from "@shared/theme";
import type { EventItem, Lang } from "@shared/data/events";

import { Icon } from "./icon";

/** A poster mood: a background from the ramps plus the type/rule/tick colors
 *  that stay legible on it. `onDark` drives the caption + scrim treatment the
 *  surrounding poster paints over the art. */
export interface PosterMood {
  bg: string;
  fg: string;
  /** Hairline rules and structural strokes. */
  rule: string;
  /** The single ember (or ink) tick — one accent per poster, never more. */
  tick: string;
  onDark: boolean;
}

/**
 * Six moods: four ink/forest darks and two lights. Kept small on purpose — a
 * feed should look like one publication, not a swatch library.
 */
const MOODS: readonly PosterMood[] = [
  { bg: ink[400], fg: bone[100], rule: "rgba(251,251,250,0.20)", tick: ember[300], onDark: true },
  { bg: ember[400], fg: bone[50], rule: "rgba(255,255,255,0.30)", tick: ink[400], onDark: true },
  { bg: forest[400], fg: bone[100], rule: "rgba(251,251,250,0.22)", tick: ember[300], onDark: true },
  { bg: ink[300], fg: bone[100], rule: "rgba(251,251,250,0.18)", tick: ember[300], onDark: true },
  { bg: bone[300], fg: ink[400], rule: "rgba(14,14,13,0.14)", tick: ember[400], onDark: false },
  { bg: ember[100], fg: ink[400], rule: "rgba(14,14,13,0.16)", tick: ember[500], onDark: false },
] as const;

function seed(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = (h * 33) ^ key.charCodeAt(i);
  return Math.abs(h);
}

/** The mood for an event, stable across renders and screens. */
export function posterMood(key: string): PosterMood {
  return MOODS[seed(key) % MOODS.length] as PosterMood;
}

/* ── Small flat mark (thumbnails, pickers) ─────────────────────────────────── */

/**
 * `hue`/`pattern` survive as parameters because the organizer-side thumbnails
 * and cover pickers already thread them; `hue` now only picks a brand mood,
 * it is never used as an HSL angle.
 */
export function PosterArt({ hue, pattern }: { hue: number; pattern: string }): React.JSX.Element {
  const m = MOODS[Math.abs(Math.round(hue)) % MOODS.length] as PosterMood;
  return (
    <Svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <Rect width={100} height={100} fill={m.bg} />
      <Mark pattern={pattern} mood={m} />
    </Svg>
  );
}

function Mark({ pattern, mood }: { pattern: string; mood: PosterMood }): React.JSX.Element {
  const { fg, rule, tick } = mood;
  switch (pattern) {
    case "grid":
      return (
        <G>
          <G stroke={rule} strokeWidth={0.6}>
            {[25, 50, 75].map((v) => <Line key={`h${v}`} x1={0} y1={v} x2={100} y2={v} />)}
            {[25, 50, 75].map((v) => <Line key={`v${v}`} x1={v} y1={0} x2={v} y2={100} />)}
          </G>
          <Rect x={25} y={25} width={25} height={25} fill={fg} opacity={0.9} />
          <Rect x={50} y={50} width={25} height={25} fill={tick} />
        </G>
      );
    case "arches":
      return (
        <G>
          <Path d="M 18 82 L 18 46 A 16 16 0 0 1 50 46 L 50 82 Z" fill={fg} opacity={0.9} />
          <Path d="M 56 82 L 56 34 A 13 13 0 0 1 82 34 L 82 82 Z" fill={tick} />
          <Line x1={10} y1={82} x2={90} y2={82} stroke={rule} strokeWidth={1.2} />
        </G>
      );
    case "dots": {
      const dots: React.JSX.Element[] = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const x = 17 + c * 13.2;
          const y = 17 + r * 13.2;
          dots.push(<Circle key={`${r}-${c}`} cx={x} cy={y} r={2.6} fill={r === 2 && c === 3 ? tick : fg} opacity={r === 2 && c === 3 ? 1 : 0.72} />);
        }
      }
      return <G>{dots}</G>;
    }
    case "rays":
      return (
        <G>
          {[0, 1, 2, 3, 4].map((i) => (
            <Rect key={i} x={0} y={14 + i * 15} width={100} height={5} fill={i === 2 ? tick : fg} opacity={i === 2 ? 1 : 0.55} />
          ))}
        </G>
      );
    case "sunburst":
    default:
      return (
        <G>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 11) * Math.PI;
            return (
              <Line
                key={i}
                x1={50}
                y1={86}
                x2={50 + Math.cos(a) * 72}
                y2={86 - Math.sin(a) * 72}
                stroke={rule}
                strokeWidth={1}
              />
            );
          })}
          <Circle cx={50} cy={86} r={18} fill={tick} />
          <Line x1={6} y1={86} x2={94} y2={86} stroke={fg} strokeWidth={1.4} opacity={0.8} />
        </G>
      );
  }
}

/* ── Editorial date plate (cards, heroes) ─────────────────────────────────── */

/**
 * One composition, three sizes. The date block anchors to the TOP-LEFT and the
 * bottom 40% stays clear: every surface that uses a poster (featured card,
 * card caption, detail hero) prints its own text down there, so the plate must
 * never compete for that band.
 */
function plateScale(h: number, dense: boolean): { pad: number; padTop: number; day: number; month: number; tick: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  if (dense) return { pad: clamp(h * 0.14, 8, 16), padTop: 0, day: clamp(h * 0.4, 20, 44), month: 0, tick: 0 };
  const pad = clamp(h * 0.085, 14, 30);
  return {
    pad,
    // Badges sit at top:12–14 and stand 26–28 tall; keep the numeral below them.
    padTop: pad + 26,
    day: clamp(h * 0.3, 38, 104),
    month: clamp(h * 0.095, 12, 24),
    tick: clamp(h * 0.05, 14, 34),
  };
}

function DatePlate({
  event, mood, dense = false, insetTop = 0,
}: {
  event: EventItem;
  mood: PosterMood;
  dense?: boolean;
  /** Safe-area top the host reserves above the plate (full-bleed heroes). */
  insetTop?: number;
}): React.JSX.Element {
  const [h, setH] = useState(0);
  const s = plateScale(h || 190, dense);
  // No parseable date? Fall back to the combined stamp so the plate is never blank.
  const day = event.day || stripWeekday(event.date);
  const month = dense ? "" : event.month;

  return (
    <View
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
      style={{ flex: 1, backgroundColor: mood.bg }}
    >
      {/* The date block centres inside the top 60%: clear of the badges every
          surface pins at top:12–14, and clear of the bottom band those same
          surfaces print their own text into. */}
      <View
        style={{
          height: "62%", paddingHorizontal: s.pad, paddingTop: s.padTop + insetTop,
          justifyContent: "center", alignItems: "flex-start",
        }}
      >
        {/* No tick on a full-bleed hero: the host already pins a back button in
            that corner and the two collide. */}
        {s.tick && !insetTop ? <View style={{ width: s.tick, height: 3, backgroundColor: mood.tick, marginBottom: s.pad * 0.5 }} /> : null}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: s.pad * 0.35 }}>
          <Text
            allowFontScaling={false}
            // Space Grotesk's numeral flag overshoots its em box — a line height
            // at 1.0 shears the top of a "1". 1.2 clears it at every plate size.
            style={type({ role: "display", weight: 700, size: s.day, leading: 1.2, track: -0.03, color: mood.fg })}
          >
            {day}
          </Text>
          {month ? (
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                type({ role: "display", weight: 500, size: s.month, leading: 1.08, track: 0.06, color: mood.fg }),
                { opacity: 0.82, flexShrink: 1 },
              ]}
            >
              {month}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Full poster: date plate (or the real cover) + optional pick badge + caption.
 *  `bare` renders just the plate/art — used when the surrounding card supplies
 *  its own badges (e.g. FeaturedCard) so badges never stack.
 *  Captions localize via the ACTIVE app language; the `lang` prop is an
 *  explicit override. */
export function EventPoster({
  event, lang: langProp, dense = false, bare = false, insetTop = 0,
}: {
  event: EventItem;
  lang?: Lang;
  dense?: boolean;
  bare?: boolean;
  /** Safe-area top a full-bleed host (the detail hero) reserves above the plate,
   *  so the date never sits under the status bar or the back button. */
  insetTop?: number;
}): React.JSX.Element {
  const { lang: appLang } = useI18n();
  const lang = langProp ?? appLang;
  const mood = posterMood(event.id);
  const hasCover = Boolean(event.coverImage);
  // Over a photo the caption always sits on a dark scrim; over a plate it takes
  // the mood's own foreground, so a light mood never prints white-on-bone.
  const capFg = hasCover || mood.onDark ? "rgba(251,251,250,0.88)" : "rgba(14,14,13,0.78)";
  const capMuted = hasCover || mood.onDark ? "rgba(251,251,250,0.62)" : "rgba(14,14,13,0.52)";
  const chipBg = hasCover || mood.onDark ? "rgba(14,14,13,0.7)" : "rgba(255,255,255,0.82)";
  const chipFg = hasCover || mood.onDark ? bone[100] : ink[400];

  return (
    <View style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      {hasCover ? (
        <>
          {/* Blurred, cover-scaled backdrop fills the letterbox with the image's
              own colors; the sharp image sits on top, uncropped (contain). */}
          <Image
            source={{ uri: event.coverImage }}
            style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
            blurRadius={24}
          />
          <Image
            source={{ uri: event.coverImage }}
            style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
            resizeMode="contain"
          />
          {/* Scrim only over photography — legibility, not decoration. The plate
              controls its own contrast and needs none. */}
          <LinearGradient
            colors={["rgba(14,14,13,0)", "rgba(14,14,13,0.55)"]}
            locations={[0.3, 1]}
            style={{ position: "absolute", inset: 0 }}
          />
        </>
      ) : (
        // A pick badge lands in the same corner as the plate's tick, so the
        // plate steps down and drops the tick when one is drawn.
        <DatePlate event={event} mood={mood} dense={dense} insetTop={insetTop || (!bare && event.pick ? 22 : 0)} />
      )}

      {!bare && event.pick ? (
        <View style={{ position: "absolute", top: 12, left: 12, width: 28, height: 28, borderRadius: radii.pill, backgroundColor: chipBg, alignItems: "center", justifyContent: "center" }}>
          <Icon name="star" size={15} color={chipFg} />
        </View>
      ) : null}

      {/* The date badge is redundant over the plate — the plate IS the date. */}
      {!bare && hasCover ? (
        <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: chipBg, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4 }}>
          <Text style={type({ role: "mono", weight: 500, size: 10, leading: 1, color: chipFg })}>{stripWeekday(event.date)}</Text>
        </View>
      ) : null}

      {!bare && !dense ? (
        <View style={{ position: "absolute", bottom: 12, left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 }}>
            {/* The organizer's own mark, when they have one — a feed row should
                carry its publisher the way a masthead does. */}
            {event.orgLogo ? (
              <Image
                source={{ uri: event.orgLogo }}
                style={{ width: 18, height: 18, borderRadius: radii.xs + 2, backgroundColor: bone[50] }}
                resizeMode="cover"
              />
            ) : null}
            <Text numberOfLines={1} style={[type({ weight: 500, size: 11, leading: 1.3, color: capFg }), { flexShrink: 1 }]}>{event.org}</Text>
          </View>
          <Text numberOfLines={1} style={type({ role: "mono", weight: 500, size: 10, leading: 1, color: capMuted })}>· {event.city[lang]}</Text>
        </View>
      ) : null}
    </View>
  );
}

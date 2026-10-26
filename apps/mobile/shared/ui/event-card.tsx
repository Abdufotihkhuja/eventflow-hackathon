/**
 * Event surfaces: EventCard (poster + meta), EventRow (compact list row), and
 * FeaturedCard (large text-over-image hero). All localize via i18n and take an
 * `onPress` for navigation.
 */
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { bone, ink } from "@eventflow/ui-tokens";

import type { EventItem } from "@shared/data/events";
import { useI18n } from "@shared/i18n";
import { accent, radii, shadow, type, usePalette } from "@shared/theme";
import { haptics } from "@shared/lib/haptics";
import { stripWeekday } from "@shared/lib/format";

import { Icon } from "./icon";
import { EventPoster, posterMood } from "./poster";

// EventPoster localizes its own caption via i18n; the stamp strips the
// weekday Cyrillic-safely (the old `\w` regex missed "сб, ").
const stamp = (e: EventItem) => `${stripWeekday(e.date)} · ${e.time}`;

export function EventCard({ event, onPress }: { event: EventItem; onPress?: () => void }): React.JSX.Element {
  const p = usePalette();
  const { tx } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { haptics.tap(); onPress?.(); }}
      style={({ pressed }) => [
        { backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, overflow: "hidden", opacity: pressed ? 0.96 : 1 },
        shadow.sm,
      ]}
    >
      {/* 16:10 gave one card per screen. The plate reads fine as a band, so the
          feed shows two to three cards instead of one. */}
      <View style={{ aspectRatio: 16 / 7 }}>
        <EventPoster event={event} />
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 13, paddingBottom: 15 }}>
        <Text style={[type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.04, color: accent.ink, transform: "uppercase" }), { marginBottom: 7 }]}>{stamp(event)}</Text>
        <Text style={type({ weight: 700, size: 16, leading: 1.22, track: -0.02, color: p.fg })}>{tx(event.title)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
          <Icon name="pin" size={13} color={p.fgMuted} />
          <Text style={type({ weight: 500, size: 12, leading: 1.3, color: p.fgMuted })} numberOfLines={1}>
            {tx(event.venue)} · {tx(event.city)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: p.border, borderStyle: "dashed" }}>
          <Text style={type({ weight: 700, size: 13, leading: 1, color: event.free ? p.forest : p.fg })}>{tx(event.price)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="users" size={13} color={p.fgSubtle} />
            <Text style={type({ role: "mono", weight: 500, size: 11, leading: 1, color: p.fgMuted })}>{event.going.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function EventRow({ event, onPress }: { event: EventItem; onPress?: () => void }): React.JSX.Element {
  const p = usePalette();
  const { tx } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { haptics.tap(); onPress?.(); }}
      style={({ pressed }) => ({
        flexDirection: "row", gap: 12, padding: 10, backgroundColor: p.surface,
        borderWidth: 1, borderColor: p.border, borderRadius: radii.card, opacity: pressed ? 0.96 : 1,
      })}
    >
      <View style={{ width: 92, height: 92, borderRadius: radii.control, overflow: "hidden" }}>
        <EventPoster event={event} dense />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.04, color: accent.ink, transform: "uppercase" })}>{stamp(event)}</Text>
        <Text numberOfLines={2} style={[type({ weight: 700, size: 15, leading: 1.2, track: -0.02, color: p.fg }), { marginTop: 5 }]}>{tx(event.title)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: "auto" }}>
          <Icon name="pin" size={12} color={p.fgMuted} />
          <Text style={type({ weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>{tx(event.city)}</Text>
        </View>
        <Text style={[type({ weight: 700, size: 12, leading: 1, color: event.free ? p.forest : p.fg }), { marginTop: 5 }]}>{tx(event.price)}</Text>
      </View>
    </Pressable>
  );
}

/** Featured-rail card geometry — the single source of truth so loading
 *  skeletons (and rail snap intervals) can mirror the real card without drift. */
/** Square, not 5:6 portrait — the date plate left a tall dead band between the
 *  date and the title block at the old ratio. */
export const FEATURED_CARD = { width: 280, radius: 18, aspect: 1 } as const;
/** Rendered height at the default width. */
export const FEATURED_CARD_HEIGHT = FEATURED_CARD.width; // 280

export function FeaturedCard({ event, width = FEATURED_CARD.width, onPress }: { event: EventItem; width?: number; onPress?: () => void }): React.JSX.Element {
  const { tx, t } = useI18n();
  const hasCover = Boolean(event.coverImage);
  const mood = posterMood(event.id);
  // Over a photo the card owns a dark scrim, so text is always light. Over a
  // plate it inherits the mood, which may well be a light one (bone / ember-100).
  const onDark = hasCover || mood.onDark;
  const overFg = onDark ? bone[50] : ink[400];
  const overMuted = onDark ? "rgba(255,255,255,0.85)" : "rgba(14,14,13,0.62)";
  const badgeBg = onDark ? "rgba(251,251,250,0.92)" : "rgba(14,14,13,0.88)";
  const badgeFg = onDark ? accent.ink : bone[100];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { haptics.tap(); onPress?.(); }}
      style={({ pressed }) => [
        { width, borderRadius: FEATURED_CARD.radius, overflow: "hidden", aspectRatio: FEATURED_CARD.aspect, opacity: pressed ? 0.96 : 1 },
        shadow.md,
      ]}
    >
      <EventPoster event={event} bare />
      {/* A scrim belongs over photography only. Over a date plate it muddies the
          mood's own colour — the plate already reserves this band, so the text
          simply takes the mood's foreground. */}
      {hasCover ? (
        <LinearGradient colors={["rgba(14,14,13,0.15)", "rgba(14,14,13,0)", "rgba(14,14,13,0.82)"]} locations={[0, 0.35, 1]} style={{ position: "absolute", inset: 0 }} />
      ) : null}
      {/* `alignItems: center` centres each child's own box — and a Text box whose
          lineHeight equals its font size is shorter than the glyphs' natural
          line, so the label sat a pixel off the icon beside it. Padding instead
          of a fixed height, and a natural line height, let both actually meet
          in the middle. */}
      <View style={{ position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: badgeBg }}>
        <Icon name="star" size={12} color={badgeFg} />
        <Text
          allowFontScaling={false}
          style={[
            type({ weight: 700, size: 10, leading: 1.4, track: 0.04, color: badgeFg, transform: "uppercase" }),
            { includeFontPadding: false },
          ]}
        >
          {t("home.featured")}
        </Text>
      </View>
      <View style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
        <Text style={[type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.04, color: overMuted, transform: "uppercase" }), { marginBottom: 7 }]}>{stamp(event)}</Text>
        <Text numberOfLines={2} style={type({ role: "display", weight: 700, size: 20, leading: 1.12, track: -0.025, color: overFg })}>{tx(event.title)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="pin" size={13} color={overMuted} />
            <Text numberOfLines={1} style={[type({ weight: 500, size: 12, leading: 1, color: overMuted }), { flexShrink: 1 }]}>{tx(event.city)}</Text>
          </View>
          <Text style={type({ weight: 700, size: 13, leading: 1, color: overFg })}>{tx(event.price)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

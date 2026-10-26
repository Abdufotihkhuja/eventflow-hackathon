/**
 * StatusDot — event lifecycle badge (design `org-kit.jsx` §1.5).
 * draft / published / live / past + `pending` (PENDING_REVIEW — not in the
 * design's LIFECYCLE map; amber, added per GAP_PLAN 1.7-16).
 *
 * `live` pulses its halo (scale 1→1.8 + fade, `dur.pulse` loop) — paused on
 * blurred screens and under reduced motion.
 */
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { useI18n } from "@shared/i18n";
import { dur, ease, useReducedMotion, useScreenFocused } from "@shared/motion";
import { radii, type, usePalette } from "@shared/theme";

import type { StringKey } from "@shared/i18n/strings";

export type EventLifecycleStatus = "draft" | "published" | "live" | "past" | "pending" | "cancelled";

const LABELS: Record<EventLifecycleStatus, StringKey> = {
  draft: "org.status.draft",
  published: "org.status.published",
  live: "org.status.live",
  past: "org.status.past",
  pending: "org.status.pending",
  cancelled: "org.status.cancelled",
};

function LiveHalo({ color }: { color: string }): React.JSX.Element {
  const focused = useScreenFocused();
  const reduced = useReducedMotion();
  const active = focused && !reduced;
  const t = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: dur.pulse, easing: ease.decel }), -1, false);
    return () => cancelAnimation(t);
  }, [active, t]);

  const halo = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - t.value),
    transform: [{ scale: 1 + 0.8 * t.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: -3, top: -3, right: -3, bottom: -3, borderRadius: radii.pill, backgroundColor: color },
        halo,
      ]}
    />
  );
}

/** Tone + label for one lifecycle. Shared with the cover-led and dense event
 *  cards, which draw the same status as a bare dot instead of a pill. */
export function useStatusTone(status: EventLifecycleStatus): { bg: string; fg: string; dot: string; label: string } {
  const p = usePalette();
  const { t } = useI18n();
  return { ...statusTones(p)[status], label: t(LABELS[status]) };
}

function statusTones(p: ReturnType<typeof usePalette>): Record<EventLifecycleStatus, { bg: string; fg: string; dot: string }> {
  return {
    draft: { bg: p.sunken, fg: p.fgMuted, dot: p.fgSubtle },
    published: { bg: p.forestSoft, fg: p.forestSoftFg, dot: p.forest },
    live: { bg: p.dangerSoft, fg: p.danger, dot: p.danger },
    past: { bg: p.sunken, fg: p.fgSubtle, dot: p.borderStrong },
    pending: { bg: p.warningSoft, fg: p.warning, dot: p.warning },
    // Not in the design's LIFECYCLE map — CANCELLED is a real API status
    // (W6 events list): sunken pill + danger ink, distinct from the live red.
    cancelled: { bg: p.sunken, fg: p.danger, dot: p.danger },
  };
}

export function StatusDot({ status }: { status: EventLifecycleStatus }): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const tone = statusTones(p)[status];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 24,
        paddingHorizontal: 10,
        borderRadius: radii.pill,
        backgroundColor: tone.bg,
      }}
    >
      <View style={{ width: 6, height: 6 }}>
        {status === "live" ? <LiveHalo color={tone.dot} /> : null}
        <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: tone.dot }} />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 11, leading: 1, track: 0.01, color: tone.fg })}>
        {t(LABELS[status])}
      </Text>
    </View>
  );
}

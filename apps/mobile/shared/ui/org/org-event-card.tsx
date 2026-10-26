/**
 * Organizer event card — Claude Design «Пять видов карточки события», 1a и 1b.
 *
 * 1a `OrgEventCard` («Без рамки»): the card IS the cover. No border, no
 * shadow, no chip row — a white status pill sits on the photo and the text
 * hangs on the list background. Capacity is one ordinary line instead of a
 * meter, so nothing competes with the title.
 *
 * 1b `OrgEventListRow` («Строка-миниатюра»): the dense mode for an organizer
 * with a dozen events — 96pt cover square, three lines, a hairline divider
 * instead of a card. Six events per screen instead of two, and the fill meter
 * survives here because that is the number this mode is scanned for.
 *
 * Both take the SAME row and lifecycle, so switching modes never changes what
 * the organizer is told — only how densely.
 */
import { Image, View, Text } from "react-native";

import type { OrgEventRow } from "@entities/org-events";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatNumber, formatTime } from "@shared/lib/format";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";
import Animated from "react-native-reanimated";

import { Icon } from "../icon";
import { PosterArt } from "../poster";
import { useStatusTone } from "./status-dot";

const DAY_MS = 86_400_000;

/** Countdown shown on live/published events only — a draft has no date to
 *  count down to, and a past one counts down to nothing. */
function useCountdown(row: OrgEventRow): string | null {
  const { t } = useI18n();
  const startMs = row.startDate ? new Date(row.startDate).getTime() : NaN;
  if (Number.isNaN(startMs)) return null;
  if (row.lifecycle !== "published" && row.lifecycle !== "live") return null;
  const days = Math.ceil((startMs - Date.now()) / DAY_MS);
  if (days < 0) return null;
  return days === 0 ? t("org.home.countdown.today") : t("org.home.countdown.days", { n: days });
}

function useLines(row: OrgEventRow): { when: string; where: string; pct: number | null } {
  const { t, lang } = useI18n();
  const when = row.startDate
    ? `${formatDateStamp(row.startDate, lang)}, ${formatTime(row.startDate, lang)}`
    : t("org.events.noDate");
  const where = [row.venue, row.city].filter(Boolean).join(" · ");
  const pct = row.capacity && row.capacity > 0 ? Math.min(1, row.registrations / row.capacity) : null;
  return { when, where, pct };
}

function Cover({ row, radius, ratio }: { row: OrgEventRow; radius: number; ratio: number }): React.JSX.Element {
  return (
    <View style={{ aspectRatio: ratio, borderRadius: radius, overflow: "hidden" }}>
      {row.coverImage ? (
        <Image source={{ uri: row.coverImage }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <PosterArt hue={row.hue} pattern={row.pattern} />
      )}
    </View>
  );
}

/* ── 1a · «Без рамки» ─────────────────────────────────────────────────────── */

export function OrgEventCard({
  row,
  index,
  onPress,
  onMore,
}: {
  row: OrgEventRow;
  index: number;
  onPress: () => void;
  onMore: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, tn, lang } = useI18n();
  const tone = useStatusTone(row.lifecycle);
  const countdown = useCountdown(row);
  const { when, where, pct } = useLines(row);
  const draft = row.lifecycle === "draft";

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} layout={crossFadeLayout()}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={row.title}
        haptic="tap"
        scaleTo={0.99}
        onPress={onPress}
        onLongPress={onMore}
        style={{ gap: 11 }}
      >
        <View>
          <Cover row={row} radius={14} ratio={1.32} />

          {/* Status reads as a white pill ON the photo — the only chip left. */}
          <View
            style={{
              position: "absolute",
              top: 11,
              left: 11,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radii.pill,
              backgroundColor: p.surface,
              shadowColor: "#1c1917",
              shadowOpacity: 0.14,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: tone.dot }} />
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 11, leading: 1, color: p.fg })}>
              {tone.label}
            </Text>
          </View>

          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("common.more")}
            haptic="tap"
            scaleTo={0.9}
            hitSlop={8}
            onPress={onMore}
            style={{
              position: "absolute",
              top: 11,
              right: 11,
              width: 30,
              height: 30,
              borderRadius: radii.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.94)",
              shadowColor: "#1c1917",
              shadowOpacity: 0.14,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <Icon name="more" size={16} sw={2.6} color="#1c1917" />
          </AnimatedPressable>
        </View>

        <View style={{ gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <Text
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
              style={[type({ weight: 600, size: 15.5, leading: 1.3, track: -0.015, color: p.fg }), { flex: 1 }]}
            >
              {row.title}
            </Text>
            {countdown ? (
              <Text
                maxFontSizeMultiplier={1.2}
                style={type({ role: "mono", weight: 600, size: 12, leading: 1, color: accent.base })}
              >
                {countdown}
              </Text>
            ) : null}
          </View>

          {where ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 14, leading: 1.4, color: p.fgMuted })}>
              {where}
            </Text>
          ) : null}
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 14, leading: 1.4, color: p.fgMuted })}>
            {when}
          </Text>

          {draft ? (
            <Text
              maxFontSizeMultiplier={1.3}
              style={[type({ weight: 400, size: 14, leading: 1.4, color: p.warning }), { marginTop: 3 }]}
            >
              {t("org.events.draft.notSubmitted")}
            </Text>
          ) : (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[type({ weight: 400, size: 14, leading: 1.4, color: p.fg }), { marginTop: 3 }]}
            >
              {row.free ? <Text style={type({ weight: 600, size: 14, leading: 1.4, color: p.fg })}>{t("common.free")}</Text> : null}
              {row.free ? " · " : ""}
              {row.capacity
                ? t("org.events.seatsOf", {
                    n: formatNumber(row.registrations, lang),
                    total: formatNumber(row.capacity, lang),
                  })
                : tn("org.events.registered", row.registrations)}
            </Text>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

/* ── 1b · «Строка-миниатюра» ──────────────────────────────────────────────── */

export function OrgEventListRow({
  row,
  index,
  last,
  onPress,
  onMore,
}: {
  row: OrgEventRow;
  index: number;
  /** The last row drops its divider — the list ends, nothing follows it. */
  last?: boolean;
  onPress: () => void;
  onMore: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, tn, lang } = useI18n();
  const tone = useStatusTone(row.lifecycle);
  const countdown = useCountdown(row);
  const { when, where, pct } = useLines(row);
  const draft = row.lifecycle === "draft";
  const full = pct !== null && pct >= 0.9;

  const meta = [when, where].filter(Boolean).join(" · ");

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} layout={crossFadeLayout()}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={row.title}
        haptic="tap"
        scaleTo={0.99}
        onPress={onPress}
        onLongPress={onMore}
        style={{
          flexDirection: "row",
          gap: 13,
          paddingVertical: 14,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: p.borderSubtle,
        }}
      >
        <View style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden" }}>
          {row.coverImage ? (
            <Image source={{ uri: row.coverImage }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <PosterArt hue={row.hue} pattern={row.pattern} />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: tone.dot }} />
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 11.5, leading: 1, color: p.fgDefault })}>
              {tone.label}
            </Text>
            {countdown ? (
              <>
                <Text maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 11.5, leading: 1, color: p.border })}>
                  ·
                </Text>
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={type({ role: "mono", weight: 600, size: 11.5, leading: 1, color: accent.base })}
                >
                  {countdown}
                </Text>
              </>
            ) : null}
          </View>

          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={type({ weight: 600, size: 15, leading: 1.25, track: -0.015, color: p.fg })}
          >
            {row.title}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.35, color: p.fgMuted })}>
            {meta}
          </Text>

          {/* The bottom line carries whatever this lifecycle is actually
              waiting on: a fill meter once it is live, plain words while it
              is not. */}
          <View style={{ marginTop: "auto" }}>
            {draft ? (
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12.5, leading: 1.35, color: p.warning })}>
                {t("org.events.draft.notSubmitted")}
              </Text>
            ) : pct !== null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1, height: 3, borderRadius: radii.pill, backgroundColor: p.sunken, overflow: "hidden" }}>
                  <View
                    style={{
                      width: `${Math.round(pct * 100)}%`,
                      height: "100%",
                      backgroundColor: full ? accent.base : p.fg,
                    }}
                  />
                </View>
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[
                    type({ role: "mono", weight: 500, size: 11.5, leading: 1, color: p.fgDefault }),
                    { fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {formatNumber(row.registrations, lang)}/{formatNumber(row.capacity ?? 0, lang)}
                </Text>
              </View>
            ) : (
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12.5, leading: 1.35, color: p.fgMuted })}>
                {tn("org.events.registered", row.registrations)}
              </Text>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

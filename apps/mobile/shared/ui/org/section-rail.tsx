/**
 * The event's section rail — the mobile answer to the web cabinet's tab row on
 * `/my-events/:id` (Обзор · Участники · Программа · Спикеры · Вопросы ·
 * Посещаемость · Сертификаты · Бейджи · Комментарии · Аналитика).
 *
 * Why a rail of pushed screens rather than real swipeable tabs: each section is
 * a long, independently-paginated list with its own actions, and stacking ten of
 * them inside one screen would keep ten queries alive and make the back gesture
 * ambiguous. The rail gives the same "everything about this event is one tap
 * away" reachability, and every section stays a normal screen with its own
 * header — which is also what makes deep links into a section work.
 *
 * The rail renders on the section screens too (with `active` set), so moving
 * between sections never goes back through the overview.
 */
import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { ScrollView, Text, View, type LayoutChangeEvent } from "react-native";

import { useEventSectionCounts } from "@entities/event-sections";
import { useI18n } from "@shared/i18n";
import { AnimatedPressable } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";

import type { StringKey } from "@shared/i18n/strings";

export type EventSectionKey =
  | "overview"
  | "attendees"
  | "agenda"
  | "speakers"
  | "questions"
  | "attendance"
  | "certificates"
  | "badges"
  | "comments"
  | "analytics";

interface SectionDef {
  key: EventSectionKey;
  label: StringKey;
  /** Route to push. The overview is the event screen itself. */
  href:
    | "/org/event/[id]"
    | "/org/attendees/[eventId]"
    | "/org/agenda/[eventId]"
    | "/org/speakers/[eventId]"
    | "/org/questions/[eventId]"
    | "/org/attendance/[eventId]"
    | "/org/certificates/[eventId]"
    | "/org/badges/[eventId]"
    | "/org/comments/[eventId]"
    | "/org/analytics/[eventId]";
  /** The route's own id param name — the overview takes `id`, the rest `eventId`. */
  param: "id" | "eventId";
}

const SECTIONS: SectionDef[] = [
  { key: "overview", label: "org.section.overview", href: "/org/event/[id]", param: "id" },
  { key: "attendees", label: "org.manage.attendees", href: "/org/attendees/[eventId]", param: "eventId" },
  { key: "agenda", label: "org.section.agenda", href: "/org/agenda/[eventId]", param: "eventId" },
  { key: "speakers", label: "org.section.speakers", href: "/org/speakers/[eventId]", param: "eventId" },
  { key: "questions", label: "org.section.questions", href: "/org/questions/[eventId]", param: "eventId" },
  { key: "attendance", label: "org.attendance.title", href: "/org/attendance/[eventId]", param: "eventId" },
  { key: "certificates", label: "org.certs.title", href: "/org/certificates/[eventId]", param: "eventId" },
  { key: "badges", label: "org.section.badges", href: "/org/badges/[eventId]", param: "eventId" },
  { key: "comments", label: "org.section.comments", href: "/org/comments/[eventId]", param: "eventId" },
  { key: "analytics", label: "org.section.analytics", href: "/org/analytics/[eventId]", param: "eventId" },
];

/**
 * Back out of a section — always to the EVENT, never to the org home.
 *
 * `goBack`'s fallbacks are tab roots by design, which is wrong here: a section
 * opened from a deep link (a push notification into an event's attendees, say)
 * has no history to pop, and dropping the organizer on the events list loses
 * the event they were looking at. Pop when we can, otherwise land on the event.
 */
export function backToEvent(router: ReturnType<typeof useRouter>, eventId: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace({ pathname: "/org/event/[id]", params: { id: eventId } });
}

export function EventSectionRail({
  eventId,
  title,
  active,
  /** Sections the event cannot have yet (a draft has no attendance) are hidden
   *  rather than shown disabled — a dead chip teaches nothing. */
  hidden,
  dark,
}: {
  eventId: string;
  title?: string;
  active: EventSectionKey;
  hidden?: EventSectionKey[];
  /** On the event screen the rail sits on the dark stage. */
  dark?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t } = useI18n();

  const shown = SECTIONS.filter((s) => !hidden?.includes(s.key));
  // Counts turn the rail from pure navigation into a status line: "Гости 7"
  // answers a question the organizer would otherwise open the section to ask.
  const counts = useEventSectionCounts(eventId);

  // Bring the ACTIVE chip into view on mount. Section→section navigation
  // remounts this rail, so without it the tenth section opens with the rail
  // showing the first five and no sign of where you are — which is what made
  // moving between sections feel like getting lost.
  const scroller = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  const onChipLayout = useCallback(
    (key: EventSectionKey) => (e: LayoutChangeEvent) => {
      if (key !== active || scrolled.current) return;
      const { x, width } = e.nativeEvent.layout;
      scrolled.current = true;
      // A little lead-in keeps the previous chip half-visible, so the strip
      // reads as a strip rather than as a left edge.
      scroller.current?.scrollTo({ x: Math.max(0, x - width - 24), animated: false });
    },
    [active],
  );

  return (
    <ScrollView
      ref={scroller}
      // A rail of chips IS a tab bar to a screen reader; without the container
      // role each chip announces as a lone tab with no set to be "1 of 10" in.
      accessibilityRole="tablist"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 7, paddingVertical: 10 }}
    >
      {shown.map((s) => {
        const on = s.key === active;
        return (
          <AnimatedPressable
            key={s.key}
            onLayout={onChipLayout(s.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            haptic="select"
            scaleTo={0.96}
            onPress={() => {
              if (on) return;
              const to = { pathname: s.href, params: { [s.param]: eventId, title: title ?? "" } };
              // Leaving the overview PUSHES, so the event stays under the
              // section and Back returns to it. Section→section REPLACES, so
              // wandering the rail does not build a pile of history to unwind.
              if (active === "overview") router.push(to);
              else router.replace(to);
            }}
            style={{
              paddingHorizontal: 13,
              height: 34,
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: on ? accent.base : dark ? "rgba(255,255,255,0.10)" : p.surface,
              borderWidth: on ? 0 : 1,
              borderColor: dark ? "rgba(255,255,255,0.16)" : p.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                maxFontSizeMultiplier={1.2}
                style={type({
                  weight: on ? 600 : 500,
                  size: 13,
                  leading: 1,
                  color: on ? accent.on : dark ? "rgba(255,255,255,0.82)" : p.fgDefault,
                })}
              >
                {t(s.label)}
              </Text>
              {/* `undefined` = not known (still loading, or the section is not
                  readable for this member) and prints NOTHING. A zero is a fact
                  and is worth showing: "Спикеры 0" is the reason to open it. */}
              {counts[s.key] !== undefined ? (
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[
                    type({
                      role: "mono",
                      weight: 600,
                      size: 11.5,
                      leading: 1,
                      color: on ? accent.on : dark ? "rgba(255,255,255,0.5)" : p.fgSubtle,
                    }),
                    { fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {counts[s.key]}
                </Text>
              ) : null}
            </View>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

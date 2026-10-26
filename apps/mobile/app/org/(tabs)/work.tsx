/**
 * 03 · Работа — «между событиями» (design tab map).
 *
 * The design's own line for this tab: "Низкая частота, но полная
 * функциональность." It lists доски задач · заявки на связь · подписчики ·
 * блог · площадки. Only boards and the blog exist on mobile — contact requests
 * and rental places have no entity here at all, and followers are a count on
 * the org profile, not a manageable list. So this hub carries the two real
 * sections rather than five rows where three go nowhere.
 *
 * This tab replaced "Гости". That was a picker whose only job was to choose an
 * event and open its attendee list — a path already owned by
 * События → событие → Участники. The design has no such tab, and two
 * top-level entries to one list is the kind of duplication that makes an app
 * feel bigger than it is.
 */
import { Redirect, useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useBoardsQuery } from "@entities/boards";
import { useBlogPostsQuery } from "@entities/org-blog";
import { useEntitlementsQuery } from "@entities/billing";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatNumber } from "@shared/lib/format";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Body, Icon, OrgHeader, Screen, Skeleton } from "@shared/ui";

/** One section of the work hub. `count` is only rendered once it is known —
 *  a "0" that is really "still loading" reads as an empty section. */
function WorkRow({
  icon, title, sub, count, locked, index, onPress,
}: {
  icon: string;
  title: string;
  sub: string;
  count?: number;
  locked?: boolean;
  index: number;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { lang } = useI18n();

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={title}
        haptic="tap"
        scaleTo={0.985}
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          padding: 15,
          borderRadius: radii.card,
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.border,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.control,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: locked ? p.sunken : accent.soft,
          }}
        >
          <Icon name={locked ? "lock" : icon} size={19} sw={1.9} color={locked ? p.fgSubtle : accent.ink} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 15, leading: 1.2, color: p.fg })}>
            {title}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>
            {sub}
          </Text>
        </View>

        {typeof count === "number" ? (
          <Text
            maxFontSizeMultiplier={1.3}
            style={[type({ role: "mono", weight: 600, size: 13, leading: 1, color: p.fgMuted }), { fontVariant: ["tabular-nums"] }]}
          >
            {formatNumber(count, lang)}
          </Text>
        ) : null}
        <Icon name="cright" size={18} color={p.fgSubtle} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function OrgWork(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const { t } = useI18n();
  const { workspace } = useAuth();

  const entQ = useEntitlementsQuery(workspace?.organizationId);
  const ent = entQ.data;
  // Same rule as the boards screen: entitlements are a HINT. Only lock when the
  // API positively says the feature is off AND limits are being enforced.
  const boardsLocked = !!ent && ent.enforcementEnabled && !ent.taskBoardEnabled;

  const boardsQ = useBoardsQuery(Boolean(workspace) && !boardsLocked);
  const blogQ = useBlogPostsQuery("", Boolean(workspace));

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const boardCount = boardsQ.data ? boardsQ.data.filter((b) => !b.isArchived).length : undefined;
  const postCount = blogQ.data?.total;

  return (
    <Screen>
      <OrgHeader title={t("org.tab.work")} sub={t("org.work.sub")} large />

      <Body tabBarClearance contentStyle={{ paddingTop: 16, gap: 10 }}>
        {entQ.isPending || boardsQ.isPending ? (
          <Skeleton h={72} r={radii.card} />
        ) : (
          <WorkRow
            index={0}
            icon="grid"
            title={t("org.boards.title")}
            sub={boardsLocked ? t("org.work.boards.locked") : t("org.boards.rowHint")}
            count={boardsLocked ? undefined : boardCount}
            locked={boardsLocked}
            onPress={() => router.push("/org/boards")}
          />
        )}

        <WorkRow
          index={1}
          icon="doc"
          title={t("org.blog.title")}
          sub={t("org.blog.rowHint")}
          count={postCount}
          onPress={() => router.push("/org/blog")}
        />

        {/* The design lists three more sections here. Saying so plainly beats
            three dead rows — and tells the organizer where they DO live. */}
        <View style={{ flexDirection: "row", gap: 9, paddingTop: 8, paddingHorizontal: 4 }}>
          <Icon name="info" size={15} sw={2} color={p.fgSubtle} />
          <Text style={[type({ weight: 400, size: 12, leading: 1.5, color: p.fgSubtle }), { flex: 1 }]}>
            {t("org.work.webOnly")}
          </Text>
        </View>
      </Body>
    </Screen>
  );
}

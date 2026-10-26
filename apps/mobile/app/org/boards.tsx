/**
 * Boards index — the way into the kanban (design 4.20).
 *
 * The design reaches boards through a "Работа" tab, but this app's bottom bar
 * is fixed at Overview · Events · Guests · Org, so boards hang off the Org tab
 * instead. A board is the only task surface on this platform — there is no
 * global task list, tasks exist inside a board column.
 */
import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBoardsQuery } from "@entities/boards";
import { useEntitlementsQuery } from "@entities/billing";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Body, Btn, FeatureLocked, Icon, IconBtn, Screen, Skeleton, StateBlock, Tag } from "@shared/ui";

export default function Boards(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { workspace } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const entQ = useEntitlementsQuery(workspace?.organizationId);
  const ent = entQ.data;
  // Entitlements are a UX HINT, never enforcement (see entities/billing). The
  // lock only shows when the API positively says the feature is off AND limits
  // are actually being applied — a 403 on billing, a staged rollout, or a
  // still-loading query must never hide a feature the server would serve.
  const boardsLocked = !!ent && ent.enforcementEnabled && !ent.taskBoardEnabled;

  const q = useBoardsQuery(Boolean(workspace) && !boardsLocked);
  const boards = (q.data ?? []).filter((b) => !b.isArchived);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg }), { flex: 1 }]}>
          {t("org.boards.title")}
        </Text>
      </View>

      {boardsLocked ? (
        <FeatureLocked
          icon="grid"
          title={t("org.plan.boards.locked.title")}
          body={t("org.plan.boards.locked.body")}
          tier={ent?.tierKey}
        />
      ) : (
      <Body
        contentStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {q.isPending ? (
          [0, 1, 2].map((i) => <Skeleton key={i} h={72} r={radii.card} />)
        ) : q.isError ? (
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>}
          />
        ) : boards.length === 0 ? (
          <StateBlock icon="grid" title={t("org.boards.empty.title")} body={t("org.boards.empty.body")} />
        ) : (
          boards.map((b, i) => (
            <Animated.View key={b.id} entering={enterStagger(Math.min(i, 5))}>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={b.name}
                haptic="tap"
                scaleTo={0.985}
                onPress={() => router.push({ pathname: "/org/board/[boardId]", params: { boardId: b.id, title: b.name } })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: radii.card,
                  backgroundColor: p.surface,
                  borderWidth: 1,
                  borderColor: p.border,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: radii.control,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: b.color ?? p.sunken,
                  }}
                >
                  <Icon name="grid" size={18} sw={2} color={b.color ? "#fff" : p.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 15, leading: 1.2, color: p.fg })}>
                    {b.name}
                  </Text>
                  {b.description ? (
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>
                      {b.description}
                    </Text>
                  ) : null}
                </View>
                {b.isFavorite ? <Tag tone="accent">★</Tag> : null}
                <Icon name="cright" size={18} color={p.fgSubtle} />
              </AnimatedPressable>
            </Animated.View>
          ))
        )}
      </Body>
      )}
    </Screen>
  );
}

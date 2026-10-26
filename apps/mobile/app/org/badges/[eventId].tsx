/**
 * 4.x · Event badges — «Бейджи» at phone scale.
 *
 * Read + delete only, and the screen says so rather than hiding it. Building a
 * badge means uploading artwork, cropping it to a print preset and placing six
 * fields on a canvas — laid out by dragging on a 400pt screen it would reach the
 * printer wrong, so that stays in the web cabinet. The ZIP download stays there
 * too: a ZIP of print-ready PDFs has nowhere useful to go on a phone.
 *
 * What this screen does answer is the question worth asking the night before:
 * is there a template for every role, or will tomorrow's badge run come up
 * short? Hence the coverage strip above the list.
 */
import { useCallback, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  roleCoverage,
  useBadgeTemplatesQuery,
  useDeleteBadgeTemplateMutation,
  type BadgeRole,
  type BadgeTemplate,
} from "@entities/event-badges";
import { PERM, useHasPermission, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { backToEvent, Body, Btn, EventSectionRail, Icon, IconBtn, Screen, Skeleton, StateBlock, useMutationError } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const ROLE_LABEL: Record<BadgeRole, StringKey> = {
  PARTICIPANT: "org.badges.role.PARTICIPANT",
  SPEAKER: "org.badges.role.SPEAKER",
  MENTOR: "org.badges.role.MENTOR",
};

function TemplateCard({
  tpl,
  index,
  onDelete,
}: {
  tpl: BadgeTemplate;
  index: number;
  /** Absent without `certificates:generate` — the card then just reads. */
  onDelete?: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const thumb = resolveMediaUrl(tpl.thumbnailUrl ?? tpl.templateUrl);
  const size = tpl.widthPx && tpl.heightPx ? `${tpl.widthPx}×${tpl.heightPx}` : (tpl.sizePreset ?? "");
  const role = tpl.recipientRole ? t(ROLE_LABEL[tpl.recipientRole]) : (tpl.roleDisplayName ?? "");

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} layout={crossFadeLayout()}>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          padding: 14,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: p.border,
          backgroundColor: p.surface,
        }}
      >
        <View style={{ width: 64, height: 44, borderRadius: 8, overflow: "hidden", backgroundColor: p.sunken }}>
          {thumb ? <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 14.5, leading: 1.25, color: p.fg }), { flexShrink: 1 }]}>
              {tpl.name}
            </Text>
            {tpl.isDefault ? (
              <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: accent.soft }}>
                <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 10, leading: 1, color: accent.base })}>
                  {t("org.badges.default")}
                </Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12.5, leading: 1.3, color: p.fgMuted })}>
            {[role, size].filter(Boolean).join(" · ")}
          </Text>
        </View>

        {onDelete ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("common.delete")}
            haptic="tap"
            hitSlop={8}
            onPress={onDelete}
            style={{ alignSelf: "center" }}
          >
            <Icon name="x" size={18} sw={2} color={p.fgSubtle} />
          </AnimatedPressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function OrgBadges(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : "";

  const [refreshing, setRefreshing] = useState(false);
  const canManage = useHasPermission()(PERM.certificatesGenerate);
  const query = useBadgeTemplatesQuery(eventId);
  const deleteM = useDeleteBadgeTemplateMutation(eventId);
  const onError = useMutationError();
  const rows = query.data ?? [];
  const coverage = roleCoverage(rows);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const onDelete = (tpl: BadgeTemplate): void => {
    confirm({
      title: t("org.badges.delete.title"),
      message: t("org.badges.delete.body"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => deleteM.mutate(tpl.id, { onError }),
    });
  };

  const gate = useWorkspaceGate();
  if (gate) return gate;

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingBottom: 4,
        }}
      >
        <IconBtn name="cleft" size={40} onPress={() => backToEvent(router, eventId)} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
            {t("org.section.badges")}
          </Text>
          {/* The event's name doubles as the way back to it — a labelled "up"
              beside the unlabelled arrow, which is what tells you where the
              arrow goes before you press it. */}
          {title ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={title}
              haptic="tap"
              hitSlop={6}
              onPress={() => backToEvent(router, eventId)}
            >
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>
                {title}
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: p.borderSubtle }}>
        <EventSectionRail eventId={eventId} title={title} active="badges" />
      </View>

      <Body
        contentStyle={{ gap: 16, paddingTop: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {query.isPending ? (
          <View style={{ gap: 10 }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} h={74} r={radii.card} />
            ))}
          </View>
        ) : query.isError ? (
          <View style={{ paddingVertical: 40 }}>
            <StateBlock
              icon="alert"
              tone="error"
              title={t("state.error.title")}
              body={t("state.error.body")}
              action={<Btn size="md" variant="secondary" onPress={() => query.refetch()}>{t("common.retry")}</Btn>}
            />
          </View>
        ) : (
          <>
            {/* Coverage first: which roles can actually be printed tomorrow. */}
            <View style={{ gap: 8 }}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.1, color: p.fgMuted, transform: "uppercase" })}
              >
                {t("org.badges.coverage")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {coverage.map(({ role, covered }) => (
                  <View
                    key={role}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 11,
                      height: 32,
                      borderRadius: radii.pill,
                      backgroundColor: p.surface,
                      borderWidth: 1,
                      borderColor: covered ? p.success : p.border,
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: covered ? p.success : p.borderStrong }} />
                    <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 12.5, leading: 1, color: p.fgDefault })}>
                      {t(ROLE_LABEL[role])}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {rows.length === 0 ? (
              <View style={{ paddingVertical: 28 }}>
                <StateBlock icon="award" title={t("org.badges.empty.title")} body={t("org.badges.empty.body")} />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {rows.map((tpl, i) => (
                  <TemplateCard key={tpl.id} tpl={tpl} index={i} onDelete={canManage ? () => onDelete(tpl) : undefined} />
                ))}
              </View>
            )}

            {/* Say plainly what this screen does not do, and where it lives. */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                padding: 13,
                borderRadius: radii.control,
                backgroundColor: p.canvas,
                borderWidth: 1,
                borderColor: p.borderStrong,
                borderStyle: "dashed",
                marginHorizontal: gutter - 16,
              }}
            >
              <Icon name="info" size={15} sw={2} color={p.fgSubtle} />
              <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 12.5, leading: 1.45, color: p.fgMuted }), { flex: 1 }]}>
                {t("org.badges.deskNote")}
              </Text>
            </View>
          </>
        )}
      </Body>
    </Screen>
  );
}

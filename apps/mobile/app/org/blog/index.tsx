/**
 * Organization blog — the list. Entry point for design 4.23 (the editor).
 *
 * Posts share the events' moderated lifecycle: DRAFT → submit → PENDING_REVIEW
 * → APPROVED/REJECTED → PUBLISHED. There is deliberately no "publish" button
 * anywhere in this feature; the only forward action an organizer has is
 * "submit", exactly as on the events side.
 */
import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBlogPostsQuery, type BlogPost, type BlogPostStatus } from "@entities/org-blog";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { formatDateStamp } from "@shared/lib/format";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette, type Palette } from "@shared/theme";
import { Body, Btn, Icon, IconBtn, Screen, Skeleton, StateBlock } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const STATUS_LABEL: Record<BlogPostStatus, StringKey> = {
  DRAFT: "org.blog.status.DRAFT",
  PENDING_REVIEW: "org.blog.status.PENDING_REVIEW",
  APPROVED: "org.blog.status.APPROVED",
  REJECTED: "org.blog.status.REJECTED",
  PUBLISHED: "org.blog.status.PUBLISHED",
};

function statusTone(s: BlogPostStatus, p: Palette): { bg: string; fg: string } {
  switch (s) {
    case "PUBLISHED":
      return { bg: p.forestSoft, fg: p.forestSoftFg };
    case "APPROVED":
      return { bg: p.successSoft, fg: p.successSoftFg };
    case "PENDING_REVIEW":
      return { bg: p.warningSoft, fg: p.warning };
    case "REJECTED":
      return { bg: p.dangerSoft, fg: p.dangerSoftFg };
    default:
      return { bg: p.sunken, fg: p.fgMuted };
  }
}

function PostRow({ post, index, onOpen }: { post: BlogPost; index: number; onOpen: (p: BlogPost) => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const tone = statusTone(post.status, p);
  const when = post.publishedAt ?? post.updatedAt ?? post.createdAt;

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={post.title}
        haptic="tap"
        scaleTo={0.985}
        onPress={() => onOpen(post)}
        style={{ padding: 14, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, gap: 8 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: tone.bg }}>
            <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.06, color: tone.fg, transform: "uppercase" })}>
              {t(STATUS_LABEL[post.status])}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          {when ? (
            <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle })}>
              {formatDateStamp(when, lang)}
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 16, leading: 1.25, track: -0.02, color: p.fg })}>
          {post.title}
        </Text>
        {post.excerpt ? (
          <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.45, color: p.fgMuted })}>
            {post.excerpt}
          </Text>
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function BlogList(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { workspace } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const q = useBlogPostsQuery("", Boolean(workspace));
  const posts = q.data?.data ?? [];

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

  const openEditor = (post?: BlogPost): void =>
    router.push({ pathname: "/org/blog/editor", params: post ? { id: post.id } : {} });

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg }), { flex: 1 }]}>
          {t("org.blog.title")}
        </Text>
        <Btn size="sm" variant="primary" icon="plus" onPress={() => openEditor()}>
          {t("org.events.createShort")}
        </Btn>
      </View>

      <Body
        contentStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {q.isPending ? (
          [0, 1, 2].map((i) => <Skeleton key={i} h={110} r={radii.card} />)
        ) : q.isError ? (
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>}
          />
        ) : posts.length === 0 ? (
          <StateBlock
            icon="doc"
            title={t("org.blog.empty.title")}
            body={t("org.blog.empty.body")}
            action={
              <Btn size="md" variant="primary" icon="plus" onPress={() => openEditor()}>
                {t("org.blog.write")}
              </Btn>
            }
          />
        ) : (
          posts.map((post, i) => <PostRow key={post.id} post={post} index={i} onOpen={openEditor} />)
        )}
      </Body>
    </Screen>
  );
}

/**
 * 4.23 · Blog editor — rich text under the keyboard.
 *
 * The design's structural point is that the formatting bar lives ABOVE THE
 * KEYBOARD rather than at the top of the screen, because on a phone the top of
 * a long article scrolls away the moment you start typing and the controls go
 * with it. `KeyboardAvoidingView` pins the bar to the keyboard, so it is always
 * within thumb reach of the caret.
 *
 * What the bar does is deliberately NARROW. The API stores BlockNote JSON, and
 * this screen bridges it through `plainTextToBlocks` / `blocksToPlainText` —
 * the same one-paragraph bridge the event description uses. A B/I/U bar that
 * pretended to apply inline marks would drop every one of them on save, so the
 * bar offers only what survives the round-trip: block-level structure typed as
 * plain lines (heading, bullet, numbered, quote). Full rich text is a
 * web-workspace job until the mobile side speaks BlockNote properly.
 *
 * Saving never publishes: DRAFT → submit → moderation, same as events.
 */
import { useEffect, useRef, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  blocksToPlainText,
  plainTextToBlocks,
  useBlogPostQuery,
  useSaveBlogPostMutation,
  useSubmitBlogPostMutation,
} from "@entities/org-blog";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Btn, Icon, IconBtn, Screen, Skeleton, useToast } from "@shared/ui";

/** Block prefixes the plain-text bridge round-trips safely. */
const BLOCKS: { key: string; icon?: string; label?: string; prefix: string }[] = [
  { key: "h2", label: "H2", prefix: "## " },
  { key: "h3", label: "H3", prefix: "### " },
  { key: "ul", icon: "list", prefix: "• " },
  { key: "ol", label: "1.", prefix: "1. " },
  { key: "quote", label: "❝", prefix: "> " },
];

export default function BlogEditor(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { workspace } = useAuth();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === "string" && id.length > 0;

  const postQ = useBlogPostQuery(editing ? id : undefined);
  const saveM = useSaveBlogPostMutation();
  const submitM = useSubmitBlogPostMutation();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const bodyRef = useRef<TextInput>(null);
  const selection = useRef({ start: 0, end: 0 });

  const prefilled = useRef(false);
  const post = postQ.data;
  useEffect(() => {
    if (!editing || !post || prefilled.current) return;
    prefilled.current = true;
    setTitle(post.title);
    setExcerpt(post.excerpt ?? "");
    setBody(blocksToPlainText(post.content));
  }, [editing, post]);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const canSubmit = post?.status === "DRAFT" || post?.status === "REJECTED";

  /** Insert a block prefix at the start of the caret's line. */
  const applyBlock = (prefix: string): void => {
    haptics.select();
    const pos = selection.current.start;
    const before = body.slice(0, pos);
    const lineStart = before.lastIndexOf("\n") + 1;
    setBody(`${body.slice(0, lineStart)}${prefix}${body.slice(lineStart)}`);
    setDirty(true);
  };

  const save = async (): Promise<{ id: string } | null> => {
    if (!title.trim()) {
      haptics.warn();
      toast.show(t("org.blog.err.title"));
      return null;
    }
    try {
      const res = await saveM.mutateAsync({
        id: editing ? id : undefined,
        payload: {
          title: title.trim(),
          content: plainTextToBlocks(body),
          excerpt: excerpt.trim() || undefined,
        },
      });
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      haptics.success();
      return { id: res.id };
    } catch {
      haptics.error();
      toast.show(t("org.blog.err.save"));
      return null;
    }
  };

  const onDone = async (): Promise<void> => {
    const res = await save();
    if (res) router.back();
  };

  const onSubmit = (): void => {
    confirm({
      title: t("org.blog.submit.title"),
      message: t("org.blog.submit.body"),
      confirmText: t("org.blog.submit"),
      cancelText: t("common.cancel"),
      onConfirm: () => {
        void (async () => {
          const res = await save();
          if (!res) return;
          try {
            await submitM.mutateAsync(res.id);
            haptics.success();
            toast.show(t("org.blog.submitted"));
            router.back();
          } catch {
            haptics.error();
            toast.show(t("org.blog.err.submit"));
          }
        })();
      },
    });
  };

  const onClose = (): void => {
    if (!dirty) {
      router.back();
      return;
    }
    confirm({
      title: t("org.form.discard.title"),
      message: t("org.form.discard.body"),
      confirmText: t("org.form.discard.confirm"),
      cancelText: t("org.form.discard.cancel"),
      destructive: true,
      onConfirm: () => router.back(),
    });
  };

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: gutter,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: p.borderSubtle,
        }}
      >
        <IconBtn name="x" size={40} onPress={onClose} accessibilityLabel={t("a11y.close")} />
        <View style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 15, leading: 1, color: p.fg })}>
            {t("org.blog.post")}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle }), { marginTop: 3 }]}>
            {savedAt ? t("org.blog.savedAt", { time: savedAt }) : t("org.blog.draft")}
          </Text>
        </View>
        <Btn size="sm" variant="primary" loading={saveM.isPending} onPress={() => void onDone()}>
          {t("common.done")}
        </Btn>
      </View>

      {editing && postQ.isPending ? (
        <View style={{ paddingHorizontal: gutter, paddingTop: 20, gap: 14 }}>
          <Skeleton h={34} r={radii.md} />
          <Skeleton h={200} r={radii.card} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 18, paddingBottom: 24 }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
          >
            <TextInput
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setDirty(true);
              }}
              placeholder={t("org.blog.titlePlaceholder")}
              placeholderTextColor={p.fgSubtle}
              multiline
              accessibilityLabel={t("org.blog.titlePlaceholder")}
              style={[
                type({ role: "display", weight: 700, size: 24, leading: 1.2, track: -0.03, color: p.fg }),
                { padding: 0, marginBottom: 14 },
              ]}
            />

            <TextInput
              value={excerpt}
              onChangeText={(v) => {
                setExcerpt(v);
                setDirty(true);
              }}
              placeholder={t("org.blog.excerptPlaceholder")}
              placeholderTextColor={p.fgSubtle}
              multiline
              maxLength={300}
              accessibilityLabel={t("org.blog.excerptPlaceholder")}
              style={[
                type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted }),
                {
                  padding: 12,
                  marginBottom: 16,
                  borderRadius: radii.control,
                  backgroundColor: p.sunken,
                },
              ]}
            />

            <TextInput
              ref={bodyRef}
              value={body}
              onChangeText={(v) => {
                setBody(v);
                setDirty(true);
              }}
              onSelectionChange={(e) => {
                selection.current = e.nativeEvent.selection;
              }}
              placeholder={t("org.blog.bodyPlaceholder")}
              placeholderTextColor={p.fgSubtle}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t("org.blog.bodyPlaceholder")}
              style={[
                type({ weight: 400, size: 16, leading: 1.6, color: p.fg }),
                { padding: 0, minHeight: 280 },
              ]}
            />

            {canSubmit ? (
              <Btn full variant="secondary" style={{ marginTop: 24 }} loading={submitM.isPending} onPress={onSubmit}>
                {t("org.blog.submit")}
              </Btn>
            ) : null}
          </ScrollView>

          {/* Format bar — pinned to the keyboard, not to the screen top */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: gutter,
              paddingVertical: 10,
              paddingBottom: Math.max(insets.bottom, 10),
              borderTopWidth: 1,
              borderTopColor: p.border,
              backgroundColor: p.surface,
            }}
          >
            {BLOCKS.map((b) => (
              <AnimatedPressable
                key={b.key}
                accessibilityRole="button"
                accessibilityLabel={b.label ?? b.key}
                haptic="tap"
                scaleTo={0.94}
                onPress={() => applyBlock(b.prefix)}
                style={{
                  minWidth: 40,
                  height: 38,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radii.control,
                  backgroundColor: p.sunken,
                }}
              >
                {b.icon ? (
                  <Icon name={b.icon} size={17} sw={2} color={p.fgDefault} />
                ) : (
                  <Text maxFontSizeMultiplier={1.2} style={type({ weight: 700, size: 13, leading: 1, color: p.fgDefault })}>{b.label}</Text>
                )}
              </AnimatedPressable>
            ))}
            <View style={{ flex: 1 }} />
            <Text maxFontSizeMultiplier={1.1} style={type({ role: "mono", weight: 500, size: 10, leading: 1.2, color: p.fgSubtle })}>
              {t("org.blog.plainNote")}
            </Text>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

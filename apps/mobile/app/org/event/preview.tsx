/**
 * 4.5b · Public-page preview.
 *
 * On the web organizer this is a side-by-side sidebar. A phone has no room for
 * that, so the design makes it a full-screen mode — and the honest way to show
 * "what a guest sees" is to render the ACTUAL public page rather than a mock of
 * it, so the preview can never drift from the real thing.
 *
 * The locale switch is the point: the public page is served per language, and
 * an organizer who filled only one locale needs to see the gap, not be told
 * about it. Switching here just reloads the same URL under `?lang=`, which is
 * what the public site reads.
 *
 * A draft has no public URL yet (the slug is only reachable once the event is
 * approved), so this screen states that instead of loading a 404.
 */
import { createElement, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { EVENT_LOCALES, useOrgEventDetailQuery, type EventLocale } from "@entities/org-events";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { env } from "@shared/config/env";
import { AnimatedPressable } from "@shared/motion";
import { gutter, radii, type, usePalette } from "@shared/theme";
import { Btn, IconBtn, Screen, Skeleton, StateBlock } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const LOCALE_LABEL: Record<EventLocale, StringKey> = { ru: "lang.ru", uz: "lang.uz", en: "lang.en" };

export default function EventPreview(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const q = useOrgEventDetailQuery(typeof id === "string" ? id : undefined);
  const [locale, setLocale] = useState<EventLocale>((lang === "uz" || lang === "en" ? lang : "ru") as EventLocale);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const ev = q.data;
  const url = ev?.slug ? `${env.webUrl}/events/${ev.slug}?lang=${locale}` : null;

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="x" size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.close")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
            {t("org.preview.title")}
          </Text>
          {url ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>
              {url.replace(/^https?:\/\//, "").split("?")[0]}
            </Text>
          ) : null}
        </View>
        {url ? (
          <IconBtn name="globe" size={40} onPress={() => void Linking.openURL(url).catch(() => undefined)} accessibilityLabel={t("org.manage.viewPublic")} />
        ) : null}
      </View>

      {/* Locale switch — "this is what a guest on {lang} sees" */}
      {url ? (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 12 }}>
          {EVENT_LOCALES.map((l) => {
            const on = locale === l;
            return (
              <AnimatedPressable
                key={l}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                haptic="select"
                scaleTo={0.96}
                onPress={() => setLocale(l)}
                style={{
                  paddingHorizontal: 13,
                  height: 34,
                  justifyContent: "center",
                  borderRadius: radii.pill,
                  backgroundColor: on ? p.inverse : p.sunken,
                }}
              >
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: on ? 600 : 500, size: 13, leading: 1, color: on ? p.fgInverse : p.fgDefault })}>
                  {t(LOCALE_LABEL[l])}
                </Text>
              </AnimatedPressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Text maxFontSizeMultiplier={1.2} style={[type({ weight: 400, size: 11, leading: 1.2, color: p.fgSubtle }), { alignSelf: "center", maxWidth: 120, textAlign: "right" }]}>
            {t("org.preview.asGuest")}
          </Text>
        </View>
      ) : null}

      {q.isPending ? (
        <View style={{ flex: 1, paddingHorizontal: gutter, paddingTop: 16 }}>
          <Skeleton h={220} r={radii.card} />
          <Skeleton h={120} r={radii.card} style={{ marginTop: 12 }} />
        </View>
      ) : !ev ? (
        <View style={{ flex: 1, paddingVertical: 28 }}>
          <StateBlock icon="alert" tone="error" title={t("org.manage.notFound")} body={t("org.manage.notFoundBody")} />
        </View>
      ) : !url ? (
        /* Draft / pending: nothing is published yet, so there is no page to show */
        <View style={{ flex: 1, paddingVertical: 28 }}>
          <StateBlock
            icon="globe"
            title={t("org.preview.none.title")}
            body={t("org.preview.none.body")}
            action={<Btn size="md" variant="secondary" onPress={() => goBack(router, "/org")}>{t("org.manage.a11yBack")}</Btn>}
          />
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            marginHorizontal: gutter,
            marginBottom: Math.max(insets.bottom, 12),
            borderRadius: radii.card,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: p.border,
            backgroundColor: p.surface,
          }}
        >
          {Platform.OS === "web" ? (
            createElement("iframe", {
              src: url,
              style: { border: 0, width: "100%", height: "100%", display: "block" },
            })
          ) : (
            <WebView
              // A REAL fetch of the public page — the preview is the product,
              // not a rendering of the form's current state.
              key={url}
              source={{ uri: url }}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              startInLoadingState
              style={{ flex: 1, backgroundColor: p.surface }}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

/**
 * 4.6b · «QR-код события» — the one QR everybody scans.
 *
 * The counterpart to the door scanner, and the reason both exist: `scan.tsx`
 * has the organizer scan each attendee's ticket, which is one phone serving a
 * whole queue. This screen turns that around — the organizer holds up ONE code
 * and the crowd scans it with their own phones, self-checking-in through the
 * public page. At a busy door the second shape moves a queue several times
 * faster, and it needs no staff phone per lane.
 *
 * So it is deliberately a PRESENTATION screen, not an admin one: dark canvas
 * to make the code pop under venue lighting, the screen held awake (a phone
 * that sleeps mid-queue is the whole feature failing), and no chrome competing
 * with the code itself.
 */
import { useEffect } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Image, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";

import { useCheckInLandingQrQuery } from "@entities/attendance";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { dur, ease, useReducedMotion } from "@shared/motion";
import { dark, gutter, light, radii, type } from "@shared/theme";
import { Btn, Icon, IconBtn, Screen, Skeleton } from "@shared/ui";

/** A sleeping screen at a door defeats the point — hold it awake while shown. */
function KeepAwakeWhileVisible(): null {
  useKeepAwake();
  return null;
}

export default function EventQr(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { workspace } = useAuth();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const eventId = typeof params.id === "string" ? params.id : "";
  const title = typeof params.title === "string" ? params.title : "";

  const q = useCheckInLandingQrQuery(eventId || undefined);
  const qrCode = q.data;

  const fade = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (qrCode) fade.value = reduced ? 1 : withTiming(1, { duration: dur.slow, easing: ease.decel });
  }, [qrCode, reduced, fade]);
  const qrStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: 0.96 + 0.04 * fade.value }] }));

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  return (
    <Screen dark bg={dark.canvasDeep ?? "#0e0e0d"}>
      {qrCode ? <KeepAwakeWhileVisible /> : null}

      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="x" dark size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.close")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 15, leading: 1.1, color: dark.fg })}>
            {t("org.eventQr.title")}
          </Text>
          {title ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: dark.fgMuted })}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 22 }}>
        {/* The code sits on a LIGHT plate regardless of the dark canvas —
            scanners need the quiet zone and the contrast polarity they expect. */}
        <View
          style={{
            width: 268,
            height: 268,
            padding: 18,
            borderRadius: radii.lg,
            backgroundColor: light.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {q.isPending ? (
            <Skeleton w={232} h={232} r={radii.md} />
          ) : qrCode ? (
            <Animated.View style={qrStyle}>
              <Image
                source={{ uri: qrCode }}
                style={{ width: 232, height: 232 }}
                resizeMode="contain"
                accessibilityLabel={t("org.eventQr.title")}
              />
            </Animated.View>
          ) : (
            <View style={{ alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
              <Icon name="alert" size={26} color={light.fgMuted} />
              <Text style={type({ weight: 500, size: 12, leading: 1.4, color: light.fgMuted, align: "center" })}>
                {t("org.eventQr.error")}
              </Text>
            </View>
          )}
        </View>

        <View style={{ gap: 8, alignItems: "center" }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 22, leading: 1.2, track: -0.03, color: dark.fg, align: "center" })}>
            {t("org.eventQr.headline")}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 14, leading: 1.5, color: dark.fgMuted, align: "center" }), { maxWidth: 300 }]}>
            {t("org.eventQr.body")}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 10 }}>
        {q.isError ? (
          <Btn full variant="glass" dark icon="refresh" onPress={() => q.refetch()}>{t("common.retry")}</Btn>
        ) : null}
        {/* The other direction: staff-scans-attendee, for anyone whose phone
            is dead or who never got the ticket. */}
        <Btn full variant="glass" dark icon="qr" onPress={() => router.replace({ pathname: "/org/scan", params: { title } })}>
          {t("org.eventQr.scanInstead")}
        </Btn>
      </View>
    </Screen>
  );
}

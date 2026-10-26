/**
 * 4.9 · Door check-in.
 *
 * The design's structural change over the old screen: the verdict is a COLOURED
 * CARD under a still-live viewfinder, not a full-screen takeover. At a door the
 * operator is holding a queue — swapping the whole screen for each result made
 * them re-aim the camera every single time. Now the frame never leaves, and
 * "Следующий" only dismisses the card.
 *
 * Not built from the design: the event-switcher pill. `POST /attendance/check-in`
 * takes a `qrCode` and nothing else — the ticket decides which event it belongs
 * to — so a picker claiming "scans land in the selected event" would be a lie.
 * The event name still shows as passive context when the caller passes one.
 * The dupe card's gate name ("вход А") is likewise not in the 409 payload.
 */
import { useEffect, useRef, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";

import { ApiError } from "@shared/api";
import { useCheckInMutation, type CheckInResult } from "@entities/registration";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { AnimatedPressable, dur, ease, spring, useReducedMotion, useScreenFocused } from "@shared/motion";
import { accent, dark, gutter, light, radii, shadow, type } from "@shared/theme";
import { haptics } from "@shared/lib/haptics";
import { goBack } from "@shared/lib/go-back";
import { Btn, Field, Icon, IconBtn, Screen, Spinner } from "@shared/ui";

type Tone = "ok" | "warn" | "err";
interface Result {
  tone: Tone;
  title: string;
  name?: string;
  sub?: string;
  detail?: string;
  ticketUrl?: string;
}

const FRAME = 210;
const CORNER = 44;
const CORNER_W = 3;

const TONE_ICON: Record<Tone, string> = { ok: "check", warn: "alert", err: "x" };
/** Filled result cards carry white text, so they take the LIGHT palette's
 *  deeper status inks — the dark palette's tones are lifted for text-on-dark
 *  and would wash out under white. */
const TONE_FILL: Record<Tone, string> = { ok: light.success, warn: light.warning, err: light.danger };

function pName(pt: CheckInResult["participant"]): string {
  return [pt?.firstName, pt?.lastName].filter(Boolean).join(" ").trim() || pt?.email || "";
}
function timeOf(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Ember scan-line sweeping the viewfinder. Pauses (parks centred, dimmed)
 *  whenever a result is up, the screen is blurred, or reduced motion is on. */
function ScanLine({ paused }: { paused: boolean }): React.JSX.Element {
  const reduced = useReducedMotion();
  const travel = FRAME - 12;
  const y = useSharedValue(travel / 2);
  const glow = useSharedValue(0.9);

  useEffect(() => {
    if (paused || reduced) {
      cancelAnimation(y);
      cancelAnimation(glow);
      y.value = withTiming(travel / 2, { duration: dur.base, easing: ease.standard });
      glow.value = withTiming(0.2, { duration: dur.base });
      return;
    }
    y.value = 0;
    y.value = withRepeat(
      withSequence(
        withTiming(travel, { duration: dur.pulse, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur.pulse, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    glow.value = withRepeat(withTiming(0.5, { duration: dur.pulse, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(y);
      cancelAnimation(glow);
    };
  }, [paused, reduced, travel, y, glow]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: glow.value + 0.4 }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: 6, right: 6, top: 6, height: 2, borderRadius: 2, backgroundColor: accent.base },
        shadow.glowWarm,
        lineStyle,
      ]}
    />
  );
}

/** Four ember L-brackets — the design's frame. Reads as "aim here" without
 *  boxing the camera in a full rectangle that fights the live image. */
function Corners(): React.JSX.Element {
  const base = { position: "absolute" as const, width: CORNER, height: CORNER, borderColor: accent.base };
  return (
    <>
      <View style={{ ...base, top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 12 }} />
      <View style={{ ...base, top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 12 }} />
      <View style={{ ...base, bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 12 }} />
      <View style={{ ...base, bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 12 }} />
    </>
  );
}

/** The verdict, as a filled card beneath the live viewfinder. */
function ResultCard({
  result, onNext, onSearch,
}: {
  result: Result;
  onNext: () => void;
  onSearch?: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const fill = TONE_FILL[result.tone];

  const s = useSharedValue(reduced ? 1 : 0.92);
  const o = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    s.value = withSpring(1, spring.disc);
    o.value = withTiming(1, { duration: dur.base, easing: ease.decel });
  }, [reduced, s, o]);
  const cardStyle = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[{ padding: 18, borderRadius: 18, backgroundColor: fill, gap: 14 }, cardStyle]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radii.pill,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={TONE_ICON[result.tone]} size={20} color="#fff" sw={result.tone === "ok" ? 3 : 2.6} />
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={[type({ role: "display", weight: 700, size: 24, leading: 1, track: -0.03, color: "#fff" }), { flex: 1 }]}
        >
          {result.title}
        </Text>
      </View>

      {result.name ? (
        <View style={{ gap: 4 }}>
          <Text numberOfLines={2} maxFontSizeMultiplier={1.2} style={type({ role: "display", weight: 700, size: 22, leading: 1.15, track: -0.03, color: "#fff" })}>
            {result.name}
          </Text>
          {result.sub ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 14, leading: 1.2, color: "rgba(255,255,255,0.8)" })}>
              {result.sub}
            </Text>
          ) : null}
        </View>
      ) : result.sub ? (
        <Text maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 17, leading: 1.35, color: "#fff" })}>{result.sub}</Text>
      ) : null}

      {result.detail ? (
        <Text maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 13, leading: 1.4, color: "rgba(255,255,255,0.85)" })}>
          {result.detail}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 9 }}>
        <AnimatedPressable
          accessibilityRole="button"
          haptic="tap"
          scaleTo={0.97}
          onPress={onNext}
          style={{ flex: 1, height: 48, borderRadius: radii.control, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}
        >
          <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 15, leading: 1, color: fill })}>{t("scan.next")}</Text>
        </AnimatedPressable>

        {result.ticketUrl ? (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="tap"
            scaleTo={0.97}
            onPress={() => void Linking.openURL(result.ticketUrl as string).catch(() => undefined)}
            style={{
              height: 48,
              paddingHorizontal: 16,
              borderRadius: radii.control,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 15, leading: 1, color: "#fff" })}>{t("org.scan.ticket")}</Text>
          </AnimatedPressable>
        ) : null}

        {result.tone === "err" && onSearch ? (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="tap"
            scaleTo={0.97}
            onPress={onSearch}
            style={{
              height: 48,
              paddingHorizontal: 16,
              borderRadius: radii.control,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 15, leading: 1, color: "#fff" })}>{t("org.scan.code")}</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function Scan(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The scanner is unconditionally a dark surface — read the dark palette
  // directly (`usePalette()` here would return the OUTER light palette).
  const p = dark;
  const { t } = useI18n();
  const { workspace } = useAuth();
  const focused = useScreenFocused();
  const params = useLocalSearchParams<{ title?: string }>();
  const title = typeof params.title === "string" ? params.title : "";

  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<"scan" | "manual">(Platform.OS === "web" ? "manual" : "scan");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [count, setCount] = useState(0);
  const [torch, setTorch] = useState(false);
  const lock = useRef(false);
  const checkIn = useCheckInMutation();

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const submit = (raw: string): void => {
    const qrCode = raw.trim();
    if (!qrCode || checkIn.isPending) return;
    checkIn.mutate(qrCode, {
      onSuccess: (data) => {
        haptics.success();
        setCount((c) => c + 1);
        const at = timeOf(data.attendance?.checkInAt);
        const email = data.participant?.email ?? "";
        setResult({
          tone: "ok",
          title: t("scan.result.valid"),
          name: pName(data.participant),
          sub: [email, at].filter(Boolean).join(" · "),
          ticketUrl: data.ticketUrls?.branded ?? data.ticketUrls?.simple,
        });
      },
      onError: (e) => {
        const ae = e instanceof ApiError ? e : null;
        const payload = (ae?.payload ?? {}) as { code?: string; lastCheckInAt?: string };
        if (ae && (ae.status === 409 || ae.code === "already_used" || payload.code === "already_used")) {
          haptics.warn();
          const at = timeOf(payload.lastCheckInAt);
          setResult({
            tone: "warn",
            title: t("scan.result.already"),
            sub: t("org.scan.already.body"),
            detail: at ? t("scan.result.alreadyAt", { time: at }) : undefined,
          });
        } else if (ae?.status === 404) {
          haptics.error();
          setResult({ tone: "err", title: t("scan.result.notfound"), sub: t("org.scan.notfound.body") });
        } else if (!ae) {
          // No ApiError means the request never reached the server — at a venue
          // that is almost always the network. Say so plainly: the design's
          // offline QUEUE is not built (see the file header), so the operator
          // must know this scan did NOT land and has to be repeated.
          haptics.error();
          setResult({ tone: "err", title: t("org.scan.offline.title"), sub: t("org.scan.offline.body") });
        } else {
          haptics.error();
          setResult({ tone: "err", title: t("scan.result.error"), sub: ae.message });
        }
      },
    });
  };

  const onScanned = ({ data }: { data: string }): void => {
    if (lock.current || result || checkIn.isPending) return;
    lock.current = true;
    submit(data);
  };
  const scanNext = (): void => {
    setResult(null);
    setCode("");
    lock.current = false;
  };

  // ── Manual entry ───────────────────────────────────────────────────────────
  if (mode === "manual") {
    return (
      <Screen dark bg={p.canvasDeep ?? "#0e0e0d"}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconBtn name="cleft" dark size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 15, leading: 1.1, color: p.fg })}>{t("scan.title")}</Text>
            {title ? (
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>{title}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ flex: 1, paddingHorizontal: gutter, paddingTop: 28, gap: 16 }}>
          {result ? <ResultCard result={result} onNext={scanNext} /> : null}
          <Field
            label={t("scan.codeLabel")}
            value={code}
            onChangeText={setCode}
            placeholder={t("scan.codePlaceholder")}
            icon="ticket"
            autoFocus
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => submit(code)}
          />
          <Btn full variant="primary" loading={checkIn.isPending} onPress={() => submit(code)}>{t("scan.checkIn")}</Btn>
          {Platform.OS !== "web" ? (
            <Btn full variant="glass" icon="cam" dark onPress={() => { setMode("scan"); scanNext(); }}>{t("scan.useCamera")}</Btn>
          ) : null}
          {count > 0 ? (
            <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 600, size: 12, leading: 1, color: p.fgMuted, align: "center" }), { marginTop: 8 }]}>
              {count} {t("scan.checkedIn")}
            </Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  // ── Camera scanner ─────────────────────────────────────────────────────────
  const granted = permission?.granted;
  const permanentlyDenied = permission != null && !permission.granted && !permission.canAskAgain;
  const sweepPaused = !focused || !!result || checkIn.isPending;

  if (!granted) {
    return (
      <Screen dark bg={p.canvasDeep ?? "#0e0e0d"}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconBtn name="cleft" dark size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 15, leading: 1.1, color: p.fg })}>{t("scan.title")}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: p.muted, alignItems: "center", justifyContent: "center" }}>
            <Icon name="cam" size={30} color={p.fg} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[type({ role: "display", weight: 700, size: 20, leading: 1.15, color: p.fg, align: "center" }), { marginTop: 18 }]}>
            {permanentlyDenied ? t("org.scan.settings.title") : t("scan.permission.title")}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted, align: "center" }), { marginTop: 8 }]}>
            {permanentlyDenied ? t("org.scan.settings.body") : t("scan.permission.body")}
          </Text>
          <View style={{ height: 18 }} />
          {permanentlyDenied ? (
            <Btn variant="primary" icon="sliders" onPress={() => void Linking.openSettings().catch(() => undefined)}>{t("org.scan.settings.open")}</Btn>
          ) : (
            <Btn variant="primary" icon="cam" onPress={() => void requestPermission()}>{t("scan.permission.grant")}</Btn>
          )}
          <View style={{ height: 10 }} />
          <Btn variant="glass" dark icon="ticket" onPress={() => setMode("manual")}>{t("org.scan.manualEntry")}</Btn>
        </View>
      </Screen>
    );
  }

  return (
    <Screen dark bg={p.canvasDeep ?? "#0e0e0d"}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onScanned}
      />

      <View style={{ flex: 1 }}>
        {/* Header — back, passive event context, torch */}
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconBtn name="cleft" glass dark size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  maxWidth: "100%",
                  paddingHorizontal: 11,
                  paddingVertical: 8,
                  borderRadius: radii.pill,
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              >
                <View style={{ width: 7, height: 7, borderRadius: radii.pill, backgroundColor: p.success }} />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[type({ weight: 500, size: 13, leading: 1, color: p.fg }), { flexShrink: 1 }]}>
                  {title}
                </Text>
              </View>
            ) : (
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 15, leading: 1.1, color: p.fg })}>{t("scan.title")}</Text>
            )}
          </View>
          {/* `fill` + `active` is what lights the glyph BRIGHT ember; `active`
              on its own resolves to the dark ember ink, which disappears
              against dark glass. The glyph stays the same either way — only
              its colour reports the torch state. */}
          <IconBtn
            name="sun"
            glass
            dark
            fill
            size={40}
            active={torch}
            onPress={() => setTorch((v) => !v)}
            accessibilityLabel={t("org.scan.torch")}
          />
        </View>

        {/* Viewfinder */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: FRAME, height: FRAME }}>
            <Corners />
            <ScanLine paused={sweepPaused} />
            {checkIn.isPending ? (
              <View style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }}>
                <Spinner />
              </View>
            ) : null}
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 13, leading: 1, color: p.fgSubtle }), { marginTop: 16 }]}>
            {t("org.scan.viewfinder")}
          </Text>
        </View>

        {/* Bottom panel — prompt, progress, or verdict */}
        <View style={{ paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 12 }}>
          {result ? (
            <ResultCard
              result={result}
              onNext={scanNext}
              onSearch={() => {
                scanNext();
                setMode("manual");
              }}
            />
          ) : checkIn.isPending ? (
            <View style={{ alignItems: "center", gap: 8, paddingVertical: 14 }}>
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "display", weight: 700, size: 22, leading: 1.2, track: -0.03, color: p.fg })}>
                {t("org.scan.reading")}
              </Text>
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 13, leading: 1, color: p.fgMuted })}>{t("org.scan.holdSteady")}</Text>
            </View>
          ) : (
            <View style={{ gap: 12, alignItems: "center" }}>
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "display", weight: 700, size: 22, leading: 1.2, track: -0.03, color: p.fg, align: "center" })}>
                {t("org.scan.aim")}
              </Text>
              <AnimatedPressable
                accessibilityRole="button"
                haptic="tap"
                scaleTo={0.96}
                onPress={() => setMode("manual")}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}
              >
                <Icon name="card" size={16} sw={1.9} color={p.fgMuted} />
                <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 15, leading: 1, color: p.fgDefault })}>{t("org.scan.manualEntry")}</Text>
              </AnimatedPressable>
            </View>
          )}

          {/* Running tally — the one number a door operator is asked for */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", minHeight: 16 }}>
            {count > 0 ? (
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 12, leading: 1, color: p.fgMuted })}>
                {count} {t("scan.checkedIn")}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

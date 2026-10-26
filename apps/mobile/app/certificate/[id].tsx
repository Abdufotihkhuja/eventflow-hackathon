/**
 * 12b · Certificate detail ("Credential") — the certificate as a physical
 * document: white credential card with shadow-lg on a sunken stage, dark
 * issuer band, meta grid, dashed ember seal (spring.pop entrance), and a
 * Download PDF action with pending + error feedback.
 *
 * Data reality (backend-recon): event certificates come from the account list
 * DTO (no organizer/role/location there) and are enriched via the PUBLIC
 * `certificates.verifyPublic({ code })` using the cert's own verification
 * code; manually added certificates carry hours/skills/credential directly.
 */
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Share, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useCertificatesQuery, useCertificateVerifyQuery } from "@entities/certificate";
import { useAuth } from "@shared/auth";
import { env } from "@shared/config/env";
import { useI18n } from "@shared/i18n";
import { formatDateFull, hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { goBack } from "@shared/lib/go-back";
import { haptics } from "@shared/lib/haptics";
import { crossFadeLayout, enterStagger, popIn, spring, useReducedMotion } from "@shared/motion";
import { accent, dark as darkPalette, gutter, light, radii, shadow, type, usePalette } from "@shared/theme";
import { Avatar, Body, Btn, Icon, IconBtn, Screen, Skeleton, StateBlock, Tag, TopBar, Wordmark, useToast } from "@shared/ui";

interface EventCert {
  id: string;
  registrationId?: string | null;
  eventName?: string | null;
  eventDate?: string | null;
  certificateUrl?: string | null;
  verificationCode?: string | null;
  generatedAt?: string | null;
}

interface ManualCert {
  id: string;
  title: string;
  provider: string;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  trainingHours?: number;
  credentialId?: string | null;
  credentialUrl?: string | null;
  certificateUrl?: string | null;
  skills?: string[];
  isVerified?: boolean;
}

interface CertsData {
  certificates?: ManualCert[];
  eventCertificates?: EventCert[];
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const a = words[0]?.[0] ?? "";
  const b = words[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "EF";
}

/** Mono uppercase eyebrow — the document's label channel (design 12b). */
function Eyebrow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Text maxFontSizeMultiplier={1.6} style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.14, color: light.fgMuted, transform: "uppercase" })}>
      {children}
    </Text>
  );
}

/** Verification seal: dashed ember ring + inner check — scale+rotate spring.pop
 *  entrance, skipped under reduced motion. */
function Seal(): React.JSX.Element {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) v.value = withSpring(1, spring.pop);
  }, [reduced, v]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value),
    transform: [{ scale: 0.4 + 0.6 * v.value }, { rotate: `${-24 * (1 - v.value)}deg` }],
  }));
  return (
    <Animated.View style={[{ width: 58, height: 58, alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width={58} height={58} style={{ position: "absolute" }}>
        <Circle cx={29} cy={29} r={28} stroke={accent.base} strokeWidth={1.5} strokeDasharray="4 5" fill="none" />
      </Svg>
      <View style={{ width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: light.border, alignItems: "center", justifyContent: "center" }}>
        <Icon name="verified" size={22} color={accent.ink} />
      </View>
    </Animated.View>
  );
}

export default function CertificateDetail(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const toast = useToast();
  const { t, tn, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, status: authStatus } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const q = useCertificatesQuery({ locale: lang }, { enabled: authStatus === "authenticated" });
  const data = q.data as unknown as CertsData | undefined;
  const eventCert = data?.eventCertificates?.find((c) => c.id === id);
  const manualCert = data?.certificates?.find((c) => c.id === id);
  // Event certs: organizer / role / location live only in the public verify payload.
  const verifyQ = useCertificateVerifyQuery(eventCert?.verificationCode ?? undefined);
  const verified = verifyQ.data?.valid === true ? verifyQ.data.certificate : undefined;

  const back = <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/certificates")} accessibilityLabel={t("a11y.back")} />;

  // ── Guest deep link ──────────────────────────────────────────────────────
  if (authStatus === "guest") {
    return (
      <Screen bg={light.sunken}>
        <TopBar title={t("certDetail.title")} border left={back} />
        <View style={{ paddingHorizontal: gutter, paddingTop: 12 }}>
          <StateBlock
            icon="award"
            title={t("auth.required.title")}
            body={t("auth.required.body")}
            action={<Btn size="md" variant="primary" onPress={() => router.push("/login")}>{t("common.signIn")}</Btn>}
          />
        </View>
      </Screen>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (authStatus === "loading" || q.isPending) {
    return (
      <Screen bg={light.sunken}>
        <TopBar title={t("certDetail.title")} border left={back} />
        <Body contentStyle={{ paddingTop: 16, gap: 16 }}>
          <Skeleton h={430} r={radii.xl} />
          <Skeleton h={52} r={radii.control} />
          <Skeleton h={52} r={radii.control} />
        </Body>
      </Screen>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (q.isError) {
    return (
      <Screen bg={light.sunken}>
        <TopBar title={t("certDetail.title")} border left={back} />
        <View style={{ paddingHorizontal: gutter, paddingTop: 12 }}>
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>}
          />
        </View>
      </Screen>
    );
  }
  if (!eventCert && !manualCert) {
    return (
      <Screen bg={light.sunken}>
        <TopBar title={t("certDetail.title")} border left={back} />
        <View style={{ paddingHorizontal: gutter, paddingTop: 12 }}>
          <StateBlock
            icon="award"
            title={t("certDetail.notFound.title")}
            body={t("certDetail.notFound.body")}
            action={<Btn size="md" variant="secondary" onPress={() => router.replace("/certificates")}>{t("tab.certificates")}</Btn>}
          />
        </View>
      </Screen>
    );
  }

  // ── Document model (event cert enriched via verify; manual carries its own) ─
  const isEvent = Boolean(eventCert);
  const title = (isEvent ? eventCert?.eventName : manualCert?.title) ?? "—";
  const ownName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const recipientName = (isEvent ? verified?.recipientName : undefined) ?? ownName ?? "—";
  const issuerName = (isEvent ? verified?.organizerName : manualCert?.provider) ?? "Eventflow";
  const isVerified = isEvent ? verifyQ.data?.valid === true : manualCert?.isVerified === true;
  const certificateUrl = isEvent ? eventCert?.certificateUrl : manualCert?.certificateUrl;
  const downloadUrl = resolveMediaUrl(certificateUrl);
  const skills = manualCert?.skills ?? [];

  const cells: { label: string; value: string; mono?: boolean }[] = [];
  if (isEvent && eventCert) {
    const issued = eventCert.generatedAt ?? verified?.issuedAt;
    if (issued) cells.push({ label: t("certDetail.meta.issued"), value: formatDateFull(issued, lang) });
    if (eventCert.verificationCode) cells.push({ label: t("certDetail.meta.credentialId"), value: eventCert.verificationCode, mono: true });
    if (verified?.recipientRole) cells.push({ label: t("certDetail.meta.role"), value: verified.recipientRole });
    if (verified?.eventLocation) cells.push({ label: t("certDetail.meta.location"), value: verified.eventLocation });
    else if (eventCert.eventDate) cells.push({ label: t("certDetail.meta.eventDate"), value: formatDateFull(eventCert.eventDate, lang) });
  } else if (manualCert) {
    if (manualCert.issueDate) cells.push({ label: t("certDetail.meta.issued"), value: formatDateFull(manualCert.issueDate, lang) });
    if (manualCert.credentialId) cells.push({ label: t("certDetail.meta.credentialId"), value: manualCert.credentialId, mono: true });
    if (manualCert.trainingHours) cells.push({ label: t("certDetail.meta.duration"), value: tn("certs.hoursCount", manualCert.trainingHours) });
    if (manualCert.expiryDate) cells.push({ label: t("certDetail.meta.expires"), value: formatDateFull(manualCert.expiryDate, lang) });
  }

  function onShare(): void {
    const verifyLink = isEvent && eventCert?.verificationCode
      ? `${env.webUrl}/certificates/verify?code=${eventCert.verificationCode}`
      : manualCert?.credentialUrl ?? undefined;
    void Share.share({ message: verifyLink ? `${title} — ${verifyLink}` : title });
  }

  async function onDownload(): Promise<void> {
    if (!downloadUrl) return;
    setDownloading(true);
    try {
      await Linking.openURL(downloadUrl);
      haptics.success();
    } catch {
      haptics.error();
      toast.show(t("certs.downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Screen bg={light.sunken}>
      <TopBar
        title={t("certDetail.title")}
        border
        left={back}
        right={<IconBtn name="share" size={40} onPress={onShare} accessibilityLabel={t("a11y.share")} />}
      />
      <Body contentStyle={{ paddingTop: 16 }}>
        {/* A. Credential document */}
        <Animated.View
          entering={enterStagger(0)}
          style={[
            { borderRadius: radii.xl, backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, overflow: "hidden" },
            shadow.lg,
          ]}
        >
          {/* A1. Dark issuer band */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 22, backgroundColor: darkPalette.canvas }}>
            <Wordmark size={18} />
            {isVerified ? (
              <Animated.View
                entering={popIn()}
                style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: darkPalette.muted }}
              >
                <Icon name="verified" size={13} color={darkPalette.fg} />
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 11, leading: 1, color: darkPalette.fg })}>{t("certDetail.verified")}</Text>
              </Animated.View>
            ) : null}
          </View>

          {/* A2. Main body */}
          <View style={{ padding: 22 }}>
            <Eyebrow>{t(isEvent ? "certDetail.eyebrow.event" : "certDetail.eyebrow.manual")}</Eyebrow>
            <Text maxFontSizeMultiplier={1.3} style={[type({ role: "display", weight: 700, size: 25, leading: 1.1, track: -0.03, color: light.fg }), { marginTop: 8 }]}>
              {title}
            </Text>

            {/* Awarded row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 }}>
              <LinearGradient
                colors={[accent.base, accent.ink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={[{ width: 44, height: 44, borderRadius: radii.control, alignItems: "center", justifyContent: "center", flexShrink: 0 }, shadow.glowWarm]}
              >
                <Icon name="award" size={24} color={accent.on} />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Eyebrow>{t("certDetail.awardedTo")}</Eyebrow>
                <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 700, size: 16, leading: 1.1, color: light.fg }), { marginTop: 5 }]}>{recipientName}</Text>
              </View>
            </View>

            {/* Meta grid — cells appear as the verify enrichment resolves. */}
            {cells.length > 0 ? (
              <Animated.View
                layout={crossFadeLayout()}
                style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: light.border }}
              >
                {cells.map((cell) => (
                  <View key={cell.label} style={{ width: "50%", marginBottom: 16, paddingRight: 14 }}>
                    <Eyebrow>{cell.label}</Eyebrow>
                    <Text
                      maxFontSizeMultiplier={1.6}
                      style={[
                        cell.mono
                          ? type({ role: "mono", weight: 600, size: 13, leading: 1.2, color: light.fg })
                          : type({ weight: 700, size: 14, leading: 1.2, color: light.fg }),
                        { marginTop: 6 },
                      ]}
                    >
                      {cell.value}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>

          {/* A3. Issuer strip + seal */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 14, paddingHorizontal: 22, backgroundColor: light.sunken, borderTopWidth: 1, borderTopColor: light.border }}>
            <Avatar initials={initialsOf(issuerName)} size={36} hue={hueFromId(issuerName)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Eyebrow>{t("certDetail.issuedBy")}</Eyebrow>
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 700, size: 14, leading: 1.1, color: light.fg }), { marginTop: 4 }]}>
                {issuerName}
              </Text>
            </View>
            <Seal />
          </View>
        </Animated.View>

        {/* B. Skills (manual certificates carry these directly) */}
        {skills.length > 0 ? (
          <Animated.View entering={enterStagger(1)}>
            <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" }), { marginTop: 22, marginBottom: 10 }]}>
              {t("certDetail.skills")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {skills.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* C. Actions */}
        <Animated.View entering={enterStagger(2)} style={{ marginTop: 20 }}>
          <Btn full variant="primary" icon="dl" disabled={!downloadUrl} loading={downloading} onPress={() => void onDownload()}>
            {t("certDetail.download")}
          </Btn>
          <View style={{ marginTop: 10 }}>
            <Btn full variant="secondary" icon="share" onPress={onShare}>{t("ticket.share")}</Btn>
          </View>
        </Animated.View>
        <View style={{ height: gutter }} />
      </Body>
    </Screen>
  );
}

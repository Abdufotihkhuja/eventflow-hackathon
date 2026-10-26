import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { Linking, RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useCertificatesQuery } from "@entities/certificate";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { formatDateFull, resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";
import { Body, Btn, Icon, Screen, Skeleton, StateBlock, TopBar, useToast } from "@shared/ui";

interface EventCert {
  id: string;
  eventName?: string | null;
  eventDate?: string | null;
  certificateUrl?: string | null;
  verificationCode?: string | null;
  generatedAt?: string | null;
}

interface CertsData {
  stats?: { totalCertificates?: number; verifiedCertificates?: number; totalTrainingHours?: number };
  eventCertificates?: EventCert[];
}

/** 12 · Certificates — live: stats tiles + the participant's event certificates. */
export default function Certificates(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  // A floating (blurred) header overlays the scroller, so the body pads by
  // its measured height instead of stopping at an opaque edge.
  const [headerH, setHeaderH] = useState(128);
  const toast = useToast();
  const { t, tn, lang } = useI18n();
  const { status: authStatus } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const q = useCertificatesQuery({ locale: lang }, { enabled: authStatus === "authenticated" });
  const data = q.data as unknown as CertsData | undefined;
  const certs = data?.eventCertificates ?? [];
  const stats = data?.stats;

  function tile(value: number | undefined, label: string): React.JSX.Element {
    return (
      <View key={label} style={{ flex: 1, padding: 14, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 24, leading: 1.2, track: -0.02, color: p.fg })}>{value ?? 0}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 500, size: 11, leading: 1.2, track: 0.02, color: p.fgMuted }), { marginTop: 4 }]}>{label}</Text>
      </View>
    );
  }

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function copyCode(code: string): Promise<void> {
    try {
      await Clipboard.setStringAsync(code);
      haptics.select();
      toast.show(t("common.toast.copied"));
    } catch {
      toast.show(t("common.toast.error"));
    }
  }

  /** Awaited download with pending + error feedback (never a silent no-op). */
  async function openCert(c: EventCert): Promise<void> {
    const url = resolveMediaUrl(c.certificateUrl);
    if (!url) return;
    setDownloadingId(c.id);
    try {
      await Linking.openURL(url);
    } catch {
      haptics.error();
      toast.show(t("certs.downloadError"));
    } finally {
      setDownloadingId(null);
    }
  }

  function renderBody(): React.JSX.Element {
    if (authStatus === "guest") {
      return (
        <StateBlock
          icon="award"
          title={t("profile.guest.title")}
          body={t("profile.guest.body")}
          action={<Btn size="md" variant="primary" onPress={() => router.push("/login")}>{t("common.signIn")}</Btn>}
        />
      );
    }
    if (q.isPending) {
      return (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} h={78} r={radii.card} style={{ flex: 1 }} />)}
          </View>
          {[0, 1].map((i) => <Skeleton key={i} h={96} r={radii.card} />)}
        </View>
      );
    }
    if (q.isError) {
      return (
        <StateBlock
          icon="alert"
          tone="error"
          title={t("state.error.title")}
          body={t("state.error.body")}
          action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>}
        />
      );
    }
    // With nothing earned the three tiles all read "0" — and the header subtitle
    // already says "0 certificates · 0 hours" right above them. One empty block
    // is the honest version; the tiles return with the first certificate.
    const hasAny = certs.length > 0 || Boolean(stats?.totalCertificates);
    return (
      <View style={{ gap: 16 }}>
        {hasAny ? (
          <Animated.View entering={enterStagger(0)} style={{ flexDirection: "row", gap: 12 }}>
            {tile(stats?.totalCertificates, t("certs.stats.total"))}
            {tile(stats?.verifiedCertificates, t("certs.stats.verified"))}
            {tile(stats?.totalTrainingHours, t("certs.stats.hours"))}
          </Animated.View>
        ) : null}

        {certs.length === 0 ? (
          <StateBlock
            icon="award"
            title={t("certs.empty.title")}
            body={t("certs.empty.body")}
            action={<Btn size="md" variant="secondary" onPress={() => router.push("/discover")}>{t("tickets.explore")}</Btn>}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {certs.map((c, i) => {
              const date = formatDateFull(c.eventDate ?? c.generatedAt ?? "", lang);
              const downloadable = Boolean(resolveMediaUrl(c.certificateUrl));
              return (
                <Animated.View key={c.id} entering={enterStagger(i + 1)}>
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityHint={t("certDetail.title")}
                    haptic="tap"
                    scaleTo={0.98}
                    onPress={() => router.push(`/certificate/${c.id}`)}
                    style={{ borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: "hidden" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                      <View style={{ width: 46, height: 46, borderRadius: radii.control, backgroundColor: accent.soft, alignItems: "center", justifyContent: "center" }}>
                        <Icon name="award" size={22} color={accent.ink} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={2} style={type({ weight: 700, size: 14, leading: 1.25, color: p.fg })}>{c.eventName ?? "—"}</Text>
                        {date ? (
                          <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 500, size: 11, leading: 1.3, color: p.fgMuted }), { marginTop: 4 }]}>
                            {t("certs.issued")} · {date}
                          </Text>
                        ) : null}
                      </View>
                      <Icon name="cright" size={16} color={p.fgSubtle} />
                    </View>
                    {c.verificationCode || downloadable ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 14 }}>
                        {c.verificationCode ? (
                          <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel={t("certs.copyCode")}
                            onPress={() => void copyCode(c.verificationCode as string)}
                            scaleTo={0.98}
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 }}
                          >
                            <Icon name="doc" size={13} color={p.fgSubtle} />
                            <Text style={[type({ role: "mono", weight: 500, size: 10, leading: 1.2, color: p.fgSubtle }), { flexShrink: 1 }]} numberOfLines={1}>
                              {t("certs.verifyCode")}: {c.verificationCode}
                            </Text>
                          </AnimatedPressable>
                        ) : (
                          <View style={{ flex: 1 }} />
                        )}
                        <Btn
                          size="sm"
                          variant="soft"
                          icon="dl"
                          disabled={!downloadable}
                          loading={downloadingId === c.id}
                          onPress={() => void openCert(c)}
                        >
                          {t("common.download")}
                        </Btn>
                      </View>
                    ) : null}
                  </AnimatedPressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  const sub =
    authStatus !== "authenticated" || q.isPending || q.isError
      ? undefined
      : `${tn("certs.earnedCount", stats?.totalCertificates ?? certs.length)} · ${tn("certs.hoursCount", stats?.totalTrainingHours ?? 0)}`;

  return (
    <Screen>
      <Body
        tabBarClearance
        contentStyle={{ paddingTop: headerH + 18, flexGrow: 1 }}
        refreshControl={
          authStatus === "authenticated" ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />
          ) : undefined
        }
      >
        {renderBody()}
      </Body>
      <TopBar large floating onHeight={setHeaderH} title={t("tab.certificates")} sub={sub} />
    </Screen>
  );
}

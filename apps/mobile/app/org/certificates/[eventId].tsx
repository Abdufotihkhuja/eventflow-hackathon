/**
 * 4.15 · Event certificates — issue in bulk, then track what was issued.
 *
 * The design's two structural ideas both survive, because both are backed:
 *  • generation is ASYNCHRONOUS, so its progress lives in a banner at the top
 *    and the screen stays usable — `POST generate` answers either "completed"
 *    inline or "queued" with a jobId that `generation-status/:jobId` polls;
 *  • a bulk action gets a CONFIRMATION SHEET first (4.15b), because "generate
 *    for everyone who attended" is irreversible-ish work on hundreds of people
 *    and the counts must be shown before, not after.
 *
 * Not built: the design's per-role breakdown ("Участники 330 · Спикеры 18") and
 * its twelve counters. `GET certificates` returns issued rows, not an
 * eligibility projection per role — there is no endpoint that answers "how many
 * speakers would this produce" without generating. The sheet therefore states
 * what it KNOWS (already issued vs. not yet) and says the rest is decided
 * server-side, instead of printing numbers it cannot stand behind.
 */
import { useMemo, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, RefreshControl, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useCertificateTemplatesQuery,
  useEventCertificatesQuery,
  useGenerateCertificatesMutation,
  useGenerationStatusQuery,
  type OrgCertificate,
} from "@entities/org-certificates";
import { PERM, useAuth, useHasPermission, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { env } from "@shared/config/env";
import { formatDateStamp, formatNumber } from "@shared/lib/format";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { backToEvent, Body, BottomSheet, Btn, Icon, IconBtn, Screen, Skeleton, StateBlock, Tag, useToast } from "@shared/ui";

/** One of the three headline figures. */
function Figure({ value, label, accented }: { value: string; label: string; accented?: boolean }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[
          type({ role: "display", weight: 700, size: 26, leading: 1, track: -0.035, color: accented ? accent.base : p.fg }),
          { fontVariant: ["tabular-nums"] },
        ]}
      >
        {value}
      </Text>
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.3}
        style={type({ role: "mono", weight: 600, size: 10, leading: 1.2, track: 0.08, color: p.fgSubtle, transform: "uppercase" })}
      >
        {label}
      </Text>
    </View>
  );
}

function CertRow({ item, index, onOpen }: { item: OrgCertificate; index: number; onOpen: (c: OrgCertificate) => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const ready = !!item.certificateUrl;

  return (
    <Animated.View entering={index < 10 ? enterStagger(Math.min(index, 5)) : undefined}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={item.recipientName ?? item.recipientEmail ?? ""}
        haptic="tap"
        scaleTo={0.99}
        disabled={!ready}
        onPress={() => onOpen(item)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1.2, color: p.fg })}>
            {item.recipientName || item.recipientEmail || "—"}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 400, size: 11, leading: 1.2, color: p.fgMuted })}>
            {[
              item.issuedAt ? formatDateStamp(item.issuedAt, lang) : null,
              item.downloadCount > 0 ? t("org.certs.downloads", { n: formatNumber(item.downloadCount, lang) }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        {/* `isStale` means the template changed after this file was made —
            the one status an organizer must act on, so it outranks "ready". */}
        {item.isStale ? (
          <Tag tone="accent">{t("org.certs.stale")}</Tag>
        ) : ready ? (
          <Tag tone="forest">{t("org.certs.ready")}</Tag>
        ) : (
          <Tag>{item.generationStatus ?? t("org.certs.pending")}</Tag>
        )}
        {ready ? <Icon name="dl" size={17} sw={2} color={p.fgSubtle} /> : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function EventCertificates(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const toast = useToast();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : "";

  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const listQ = useEventCertificatesQuery(eventId || undefined, { search: q.trim() });
  const templatesQ = useCertificateTemplatesQuery(eventId || undefined);
  const generateM = useGenerateCertificatesMutation(eventId || undefined);
  const jobQ = useGenerationStatusQuery(eventId || undefined, jobId);

  const rows = useMemo(() => listQ.data?.certificates ?? [], [listQ.data]);
  const total = listQ.data?.total ?? 0;
  const templates = templatesQ.data ?? [];

  const downloads = useMemo(() => rows.reduce((n, c) => n + (c.downloadCount ?? 0), 0), [rows]);
  const stale = useMemo(() => rows.filter((c) => c.isStale).length, [rows]);

  const job = jobQ.data;
  const jobRunning = !!jobId && !!job && !["completed", "failed", "error"].includes(job.status);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const canIssue = useHasPermission()(PERM.certificatesGenerate);
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([listQ.refetch(), templatesQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openCert = (c: OrgCertificate): void => {
    const url = c.certificateUrl?.startsWith("http") ? c.certificateUrl : `${env.apiUrl}/api/v1/events/${eventId}/certificates/${c.id}/download`;
    void Linking.openURL(url).catch(() => toast.show(t("org.certs.openError")));
  };

  const runGenerate = (force: boolean): void => {
    setSheetOpen(false);
    generateM.mutate(
      { forceRegenerate: force },
      {
        onSuccess: (res) => {
          if (res.status === "queued") {
            setJobId(res.jobId);
            haptics.tap();
            return;
          }
          haptics.success();
          toast.show(t("org.certs.done", { n: formatNumber(res.generated, lang) }));
        },
        onError: () => {
          haptics.error();
          toast.show(t("org.certs.error"));
        },
      },
    );
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="cleft" size={40} onPress={() => backToEvent(router, eventId)} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
            {t("org.certs.title")}
          </Text>
          {title ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>
              {title}
            </Text>
          ) : null}
        </View>
        {/* Reading the register is `certificates:read`; issuing is a separate
            right, and the server enforces it whatever the button says. */}
        {canIssue ? (
          <Btn size="sm" variant="primary" icon="award" loading={generateM.isPending} onPress={() => setSheetOpen(true)}>
            {t("org.certs.issue")}
          </Btn>
        ) : null}
      </View>

      {/* Generation banner — the job keeps running if you leave this screen,
          so its progress is reported here rather than blocking the view. */}
      {jobRunning ? (
        <View
          style={{
            marginHorizontal: gutter,
            marginTop: 14,
            padding: 13,
            borderRadius: radii.card,
            backgroundColor: accent.soft,
            borderWidth: 1,
            borderColor: accent.softHover,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Icon name="refresh" size={16} sw={2.2} color={accent.ink} />
            <Text style={[type({ weight: 600, size: 13, leading: 1.2, color: accent.ink }), { flex: 1 }]}>{t("org.certs.running")}</Text>
            <Text style={[type({ role: "mono", weight: 600, size: 12, leading: 1, color: accent.ink }), { fontVariant: ["tabular-nums"] }]}>
              {formatNumber(job?.processed ?? 0, lang)} / {formatNumber(job?.total ?? 0, lang)}
            </Text>
          </View>
          <View style={{ height: 4, borderRadius: radii.pill, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <View
              style={{
                width: `${job?.total ? Math.round(((job.processed ?? 0) / job.total) * 100) : 5}%`,
                height: "100%",
                backgroundColor: accent.base,
              }}
            />
          </View>
        </View>
      ) : null}

      {/* Headline figures */}
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: gutter, paddingTop: 16 }}>
        <Figure value={formatNumber(total, lang)} label={t("org.certs.issued")} />
        <Figure value={formatNumber(downloads, lang)} label={t("org.certs.downloadsLabel")} />
        {stale > 0 ? <Figure accented value={formatNumber(stale, lang)} label={t("org.certs.staleLabel")} /> : null}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: gutter, paddingTop: 16 }}>
        <View
          style={{
            height: 38,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            borderRadius: radii.control,
            backgroundColor: p.sunken,
          }}
        >
          <Icon name="search" size={16} sw={2} color={p.fgSubtle} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("org.certs.search")}
            placeholderTextColor={p.fgSubtle}
            autoCorrect={false}
            accessibilityLabel={t("org.certs.search")}
            style={[type({ weight: 400, size: 15, leading: 1, color: p.fg }), { flex: 1, padding: 0 }]}
          />
          {q ? (
            <AnimatedPressable accessibilityRole="button" accessibilityLabel={t("common.clear")} haptic="tap" hitSlop={8} onPress={() => setQ("")}>
              <Icon name="x" size={16} sw={2} color={p.fgMuted} />
            </AnimatedPressable>
          ) : null}
        </View>
      </View>

      <Body
        contentStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {listQ.isPending ? (
          <View style={{ gap: 10, paddingTop: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} h={48} r={radii.control} />
            ))}
          </View>
        ) : listQ.isError ? (
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => listQ.refetch()}>{t("common.retry")}</Btn>}
          />
        ) : rows.length === 0 ? (
          <StateBlock
            icon="award"
            title={q ? t("org.certs.empty.search") : t("org.certs.empty.title")}
            body={q ? t("org.certs.empty.searchBody") : t("org.certs.empty.body")}
            action={
              q ? undefined : (
                canIssue ? (
                  <Btn size="md" variant="primary" icon="award" onPress={() => setSheetOpen(true)}>
                    {t("org.certs.issue")}
                  </Btn>
                ) : undefined
              )
            }
          />
        ) : (
          <View>
            {rows.map((c, i) => (
              <View key={c.id}>
                {i === 0 ? null : <View style={{ height: 1, backgroundColor: p.borderSubtle }} />}
                <CertRow item={c} index={i} onOpen={openCert} />
              </View>
            ))}
          </View>
        )}
      </Body>

      {/* 4.15b · confirm before a bulk run */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} maxHeightRatio={0.7} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text style={type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
              {t("org.certs.confirm.title")}
            </Text>
            <Text style={type({ weight: 400, size: 13, leading: 1.45, color: p.fgMuted })}>{t("org.certs.confirm.body")}</Text>
          </View>

          {templates.length === 0 ? (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                padding: 13,
                borderRadius: radii.control,
                backgroundColor: p.warningSoft,
              }}
            >
              <Icon name="alert" size={17} sw={2} color={p.warning} />
              <Text style={[type({ weight: 500, size: 13, leading: 1.4, color: p.warning }), { flex: 1 }]}>
                {t("org.certs.noTemplate")}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Figure value={formatNumber(total, lang)} label={t("org.certs.issued")} />
              <Figure value={formatNumber(templates.length, lang)} label={t("org.certs.templates")} />
            </View>
          )}

          <View style={{ gap: 10 }}>
            <Btn full size="lg" variant="primary" disabled={templates.length === 0} loading={generateM.isPending} onPress={() => runGenerate(false)}>
              {t("org.certs.generateMissing")}
            </Btn>
            {total > 0 ? (
              <Btn full variant="secondary" disabled={templates.length === 0} onPress={() => runGenerate(true)}>
                {t("org.certs.regenerateAll")}
              </Btn>
            ) : null}
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

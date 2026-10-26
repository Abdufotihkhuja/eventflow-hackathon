import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, Share, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { toCardEvent } from "@entities/event";
import { useCancelRegistrationMutation, useMyRegistrationsQuery, useTicketQrQuery } from "@entities/registration";
import { useAuth } from "@shared/auth";
import { env } from "@shared/config/env";
import { confirm } from "@shared/lib/confirm";
import { goBack } from "@shared/lib/go-back";
import { haptics } from "@shared/lib/haptics";
import { useI18n } from "@shared/i18n";
import type { StringKey } from "@shared/i18n/strings";
import { AnimatedPressable, dur, ease, enterStagger, useReducedMotion } from "@shared/motion";
import { accent, dark as darkPalette, gutter, light, radii, type } from "@shared/theme";
import { Body, Btn, Icon, IconBtn, Screen, Skeleton, StateBlock, TopBar } from "@shared/ui";

interface Reg {
  id: string;
  status?: string;
  role?: string;
  ticketNumber?: string | null;
  event: {
    id: string;
    slug?: string;
    title: string;
    coverImage?: string | null;
    startDate: string;
    endDate?: string | null;
    venue?: string | null;
    city?: string | null;
    format?: string;
    organization?: { name?: string; companyName?: string } | null;
  };
}

const STATUS_KEY: Record<string, string> = {
  APPROVED: "tickets.status.APPROVED",
  PENDING: "tickets.status.PENDING",
  CANCELLED: "tickets.status.CANCELLED",
  REJECTED: "tickets.status.REJECTED",
};

/** Participant roles carry fixed backend values — translate, never render raw. */
const ROLE_KEY: Record<string, string> = {
  PARTICIPANT: "ticket.role.PARTICIPANT",
  SPEAKER: "ticket.role.SPEAKER",
  MENTOR: "ticket.role.MENTOR",
};

/** Screen stays awake while a scannable QR is on it (door-scan moment). */
function KeepAwakeWhileVisible(): null {
  useKeepAwake();
  return null;
}

/** 11b · Ticket detail — dark page, the REAL server-issued QR (never fabricated),
 *  real ticket number, identity, and cancel. */
export default function TicketDetail(): React.JSX.Element {
  const router = useRouter();
  const { t, tx, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, status: authStatus } = useAuth();
  const reduced = useReducedMotion();

  // Guests never fire the query — a deep link lands on the sign-in prompt
  // below instead of a misleading "not found".
  const q = useMyRegistrationsQuery({ limit: 100 }, { enabled: authStatus === "authenticated" });
  const cancel = useCancelRegistrationMutation();
  const reg = ((q.data as unknown as { data?: Reg[] } | undefined)?.data ?? []).find((r) => r.id === id);

  const status = reg?.status ?? "APPROVED";
  const isApproved = status === "APPROVED";
  const isTerminated = status === "CANCELLED" || status === "REJECTED";
  // The QR is only minted for an approved registration (server requires it).
  const qrQ = useTicketQrQuery(reg && isApproved ? id : undefined);
  const qrCode = (qrQ.data as unknown as { qrCode?: string } | undefined)?.qrCode;

  // QR reveal: fade + scale 0.96→1 once the image has actually decoded.
  const qrIn = useSharedValue(reduced ? 1 : 0);
  const qrStyle = useAnimatedStyle(() => ({
    opacity: qrIn.value,
    transform: [{ scale: 0.96 + 0.04 * qrIn.value }],
  }));

  function onShare(): void {
    if (!reg) return;
    const link = reg.event.slug ? ` — ${env.webUrl}/events/${reg.event.slug}` : "";
    void Share.share({ message: `${reg.event.title}${link}` });
  }

  function onCancel(): void {
    confirm({
      title: t("ticket.cancel.title"),
      message: t("ticket.cancel.message"),
      confirmText: t("ticket.cancel.confirm"),
      cancelText: t("ticket.cancel.keep"),
      destructive: true,
      onConfirm: () =>
        cancel.mutate(id, {
          onSuccess: () => router.back(),
          onError: () => {
            haptics.error();
            Alert.alert(t("state.error.title"), t("ticket.cancel.error"));
          },
        }),
    });
  }

  const back = <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/tickets")} accessibilityLabel={t("a11y.back")} />;

  // ── Guest deep link ──────────────────────────────────────────────────────
  if (authStatus === "guest") {
    return (
      <Screen dark bg={darkPalette.canvas}>
        <TopBar title={t("ticket.title")} left={back} />
        <View style={{ paddingHorizontal: gutter, paddingTop: 12 }}>
          <StateBlock
            icon="ticket"
            title={t("auth.required.title")}
            body={t("ticket.signIn.body")}
            action={<Btn size="md" variant="primary" onPress={() => router.push("/login")}>{t("common.signIn")}</Btn>}
          />
        </View>
      </Screen>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (authStatus === "loading" || (q.isPending && !reg)) {
    return (
      <Screen dark bg={darkPalette.canvas}>
        <TopBar title={t("ticket.title")} left={back} />
        <Body contentStyle={{ paddingTop: 4, alignItems: "center", gap: 16 }}>
          <Skeleton w="70%" h={24} />
          <Skeleton w="100%" h={360} r={radii.card} />
        </Body>
      </Screen>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!reg) {
    return (
      <Screen dark bg={darkPalette.canvas}>
        <TopBar title={t("ticket.title")} left={back} />
        <View style={{ paddingHorizontal: gutter, paddingTop: 12 }}>
          <StateBlock
            icon="ticket"
            title={t("ticket.notFound.title")}
            body={t("ticket.notFound.body")}
            action={<Btn size="md" variant="secondary" onPress={() => router.replace("/tickets")}>{t("tab.tickets")}</Btn>}
          />
        </View>
      </Screen>
    );
  }

  const card = toCardEvent(reg.event as never, lang);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";
  let roleLabel = t("ticket.standard");
  if (reg.role) roleLabel = ROLE_KEY[reg.role] ? t(ROLE_KEY[reg.role] as StringKey) : reg.role;
  const fields: [string, string][] = [
    [t("ticket.field.name"), name],
    [t("ticket.field.type"), roleLabel],
    [t("ticket.field.status"), t((STATUS_KEY[status] ?? "tickets.status.APPROVED") as StringKey)],
    [t("ticket.field.doors"), card.time],
  ];

  return (
    <Screen dark bg={darkPalette.canvas}>
      {isApproved && qrCode ? <KeepAwakeWhileVisible /> : null}
      <TopBar
        title={t("ticket.title")}
        left={back}
        right={<IconBtn name="share" size={40} onPress={onShare} accessibilityLabel={t("ticket.share")} />}
      />
      <Body contentStyle={{ paddingTop: 4 }}>
        {/* Header */}
        <Animated.View entering={enterStagger(0)} style={{ alignItems: "center", marginBottom: 4 }}>
          <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.22, color: accent.bright, transform: "uppercase" }), { marginBottom: 12 }]}>
            {t("ticket.admitOne")}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 24, leading: 1.1, track: -0.03, color: darkPalette.fg, align: "center" })}>{tx(card.title)}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 500, size: 11, leading: 1.4, color: darkPalette.fgMuted, align: "center" }), { marginTop: 8 }]}>
            {card.date} · {card.time}{card.venue[lang] ? ` · ${tx(card.venue)}` : ""}
          </Text>
        </Animated.View>

        {/* Ticket card — a light physical object on the dark stage. */}
        <Animated.View
          entering={enterStagger(1)}
          style={{
            marginTop: 20,
            borderRadius: radii.card,
            backgroundColor: light.canvas,
            overflow: "hidden",
            shadowColor: darkPalette.canvasDeep,
            shadowOpacity: 0.4,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 20 },
            elevation: 16,
          }}
        >
          <View style={{ paddingTop: 26, paddingHorizontal: 24, paddingBottom: 20, alignItems: "center" }}>
            <View style={{ padding: 12, backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: radii.lg, width: 196, height: 196, alignItems: "center", justifyContent: "center" }}>
              {isApproved && qrCode ? (
                <Animated.Image
                  source={{ uri: qrCode }}
                  onLoad={() => {
                    qrIn.value = reduced ? 1 : withTiming(1, { duration: dur.slow, easing: ease.decel });
                  }}
                  style={[{ width: 172, height: 172 }, qrStyle]}
                  resizeMode="contain"
                  accessibilityLabel={t("ticket.scanAtDoor")}
                />
              ) : isApproved && qrQ.isError ? (
                <View style={{ width: 172, height: 172, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 10 }}>
                  <Icon name="alert" size={26} color={light.fgMuted} />
                  <Text style={[type({ weight: 500, size: 12, leading: 1.4, color: light.fgMuted, align: "center" })]}>
                    {t("ticket.qrError")}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => qrQ.refetch()}
                    hitSlop={8}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                  >
                    <Icon name="refresh" size={15} color={light.fg} />
                    <Text style={type({ weight: 600, size: 13, leading: 1, color: light.fg })}>{t("common.retry")}</Text>
                  </Pressable>
                </View>
              ) : isApproved ? (
                <Skeleton w={172} h={172} r={radii.lg} />
              ) : (
                <Text style={[type({ weight: 500, size: 12, leading: 1.4, color: light.fgMuted, align: "center" }), { paddingHorizontal: 8 }]}>
                  {isTerminated ? t("ticket.cancelled.note") : t("ticket.qrPending")}
                </Text>
              )}
            </View>
            {isApproved ? (
              <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 500, size: 10, leading: 1, track: 0.16, color: light.fgMuted, transform: "uppercase" }), { marginTop: 16 }]}>{t("ticket.scanAtDoor")}</Text>
            ) : null}
            {reg.ticketNumber ? (
              <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 600, size: 14, leading: 1, track: 0.06, color: light.fg }), { marginTop: 8 }]}>{reg.ticketNumber}</Text>
            ) : null}
          </View>

          {/* Tear strip */}
          <View style={{ height: 18, position: "relative", justifyContent: "center" }}>
            <View style={{ position: "absolute", left: -10, top: 0, width: 20, height: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: darkPalette.canvas }} />
            <View style={{ position: "absolute", right: -10, top: 0, width: 20, height: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: darkPalette.canvas }} />
            <View style={{ marginHorizontal: 18, borderTopWidth: 2, borderTopColor: light.borderStrong, borderStyle: "dashed" }} />
          </View>

          {/* Fields */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
            {fields.map(([label, value]) => (
              <View key={label} style={{ width: "50%", marginBottom: 16 }}>
                <Text maxFontSizeMultiplier={1.6} style={type({ weight: 500, size: 9, leading: 1, track: 0.14, color: light.fgMuted, transform: "uppercase" })}>{label}</Text>
                <Text maxFontSizeMultiplier={1.6} style={[type({ weight: 700, size: 13, leading: 1.2, color: light.fg }), { marginTop: 5 }]}>{value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={enterStagger(2)}>
          <View style={{ marginTop: 18 }}>
            <Btn full variant="secondary" icon="share" onPress={onShare}>{t("ticket.share")}</Btn>
          </View>
          {!isTerminated ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityState={{ busy: cancel.isPending }}
              onPress={onCancel}
              disabled={cancel.isPending}
              scaleTo={0.98}
              rippleBorderless
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "center", marginTop: 22, minHeight: 24 }}
            >
              {cancel.isPending ? <ActivityIndicator size="small" color={darkPalette.danger} /> : null}
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1, color: darkPalette.danger })}>
                {t("ticket.cancel")}
              </Text>
            </AnimatedPressable>
          ) : null}
        </Animated.View>
      </Body>
    </Screen>
  );
}

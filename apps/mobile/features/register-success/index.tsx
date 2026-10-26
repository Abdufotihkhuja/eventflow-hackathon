/**
 * Register moment — the staged confirmation after a free registration
 * (design board 10 + states RegProcessing/RegSuccess).
 *
 * A full-screen modal owned by the event-detail screen (no route push, so the
 * back gesture can never land back "inside" the mutation): a blocking
 * processing state while the register mutation is in flight, then the success
 * moment — forest check disc (spring.disc overshoot + success haptic), a
 * mini-ticket card with the REAL server-issued QR (entities/registration
 * `getQrCode` data-URL — never fabricated), and View ticket / Done.
 * No confetti, no wallet passes (no pass backend) — the forest glow IS the
 * celebration. PENDING registrations get an honest "request sent" variant.
 */
import { useEffect } from "react";
import { Image, Modal, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { useTicketQrQuery } from "@entities/registration";
import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, dur, enterStagger, spring, useReducedMotion } from "@shared/motion";
import { radii, shadow, type, usePalette } from "@shared/theme";
import { Btn, Icon, Skeleton, Spinner, Tag } from "@shared/ui";

/** The just-created registration (from the register mutation response). */
export interface RegisterMomentResult {
  regId: string;
  status?: string;
  ticketNumber?: string | null;
}

/** Sentinel split point so the event title can be bolded inside the body copy. */
const TITLE_SLOT = "\u001F";

export function RegisterMoment({
  processing,
  result,
  eventTitle,
  dateLine,
  onDone,
  onViewTicket,
}: {
  /** Register mutation in flight — blocking, not dismissible. */
  processing: boolean;
  /** Successful registration — switches to the success moment. */
  result: RegisterMomentResult | null;
  eventTitle: string;
  /** Mono meta line for the mini-ticket (e.g. "Jun 14 · 7:00 PM"). */
  dateLine: string;
  onDone: () => void;
  onViewTicket: (regId: string) => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const visible = processing || result != null;
  const approved = result?.status === "APPROVED" || result?.status === "ATTENDED";
  // The QR is only minted for approved registrations (server contract).
  const qrQ = useTicketQrQuery(approved ? result?.regId : undefined);
  const qrCode = (qrQ.data as unknown as { qrCode?: string } | undefined)?.qrCode;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Hardware back: never escape mid-mutation; from success it means Done.
        if (result) onDone();
      }}
    >
      <View style={{ flex: 1, backgroundColor: p.canvas, paddingHorizontal: 30, alignItems: "center", justifyContent: "center" }}>
        {result ? (
          <SuccessMoment
            approved={approved}
            eventTitle={eventTitle}
            dateLine={dateLine}
            ticketNumber={result.ticketNumber}
            qr={{ code: qrCode, isError: qrQ.isError, retry: () => void qrQ.refetch() }}
            onDone={onDone}
            onViewTicket={() => onViewTicket(result.regId)}
          />
        ) : (
          <View style={{ alignItems: "center", gap: 18, paddingHorizontal: 10 }}>
            <Spinner size={40} />
            <Text style={type({ role: "display", weight: 700, size: 19, leading: 1.2, track: -0.02, color: p.fg, align: "center" })}>
              {t("regSuccess.processing")}
            </Text>
            <Text style={[type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted, align: "center" }), { maxWidth: 280, marginTop: -8 }]}>
              {t("regSuccess.processingBody")}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

function SuccessMoment({
  approved,
  eventTitle,
  dateLine,
  ticketNumber,
  qr,
  onDone,
  onViewTicket,
}: {
  approved: boolean;
  eventTitle: string;
  dateLine: string;
  ticketNumber?: string | null;
  qr: { code?: string; isError: boolean; retry: () => void };
  onDone: () => void;
  onViewTicket: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const disc = useSharedValue(reduced ? 1 : 0.4);
  const discOpacity = useSharedValue(reduced ? 0 : 1);

  // The moment: disc lands with a visible overshoot + success haptic.
  useEffect(() => {
    haptics.success();
    if (reduced) discOpacity.value = withTiming(1, { duration: dur.base });
    else disc.value = withSpring(1, spring.disc);
  }, [disc, discOpacity, reduced]);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: disc.value }],
    opacity: reduced ? discOpacity.value : 1,
  }));

  const [bodyPre, bodyPost] = t("regSuccess.body", { title: TITLE_SLOT }).split(TITLE_SLOT);

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {/* Forest check disc with the colored-glow shadow (the signature). */}
      <Animated.View
        style={[
          {
            width: 80,
            height: 80,
            borderRadius: radii.pill,
            backgroundColor: p.forest,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: p.forest,
            shadowOpacity: 0.5,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
          },
          discStyle,
        ]}
      >
        <Icon name="check" size={40} color={p.fgOnBrand} sw={3} />
      </Animated.View>

      <Animated.View entering={enterStagger(1)} style={{ alignItems: "center" }}>
        <Text style={[type({ role: "display", weight: 700, size: 27, leading: 1.05, track: -0.03, color: p.fg, align: "center" }), { marginTop: 20 }]}>
          {approved ? t("regSuccess.title") : t("regSuccess.pendingTitle")}
        </Text>
        <Text style={[type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted, align: "center" }), { marginTop: 8, maxWidth: 300 }]}>
          {approved ? (
            <>
              {bodyPre}
              <Text style={type({ weight: 600, size: 14, leading: 1.5, color: p.fg })}>{eventTitle}</Text>
              {bodyPost}
            </>
          ) : (
            t("detail.registrationPendingBody")
          )}
        </Text>
      </Animated.View>

      {/* Mini ticket — real server QR; PENDING has no QR (honest variant). */}
      <Animated.View entering={enterStagger(2)} style={{ width: "100%" }}>
        {approved ? (
          <View
            style={[
              { marginTop: 24, borderRadius: radii.card + 2, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: "hidden" },
              shadow.md,
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 20 }}>
              <View style={{ padding: 8, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.lg }}>
                {qr.code ? (
                  <Image source={{ uri: qr.code }} style={{ width: 88, height: 88 }} resizeMode="contain" accessibilityLabel={t("ticket.scanAtDoor")} />
                ) : qr.isError ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    haptic="tap"
                    onPress={qr.retry}
                    style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <Icon name="refresh" size={18} color={p.fgMuted} />
                    <Text style={type({ weight: 600, size: 11, leading: 1.2, color: p.fgMuted, align: "center" })}>{t("common.retry")}</Text>
                  </AnimatedPressable>
                ) : (
                  <Skeleton w={88} h={88} r={radii.md} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={type({ weight: 700, size: 15, leading: 1.2, color: p.fg })}>{eventTitle}</Text>
                <Text style={[type({ role: "mono", weight: 500, size: 11, leading: 1.4, color: p.fgMuted }), { marginTop: 6 }]}>{dateLine}</Text>
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <Tag tone="success">{t("tickets.status.APPROVED")}</Tag>
                </View>
              </View>
            </View>
            {ticketNumber ? (
              <View style={{ borderTopWidth: 1, borderTopColor: p.border, borderStyle: "dashed", paddingVertical: 12, paddingHorizontal: 20 }}>
                <Text style={type({ role: "mono", weight: 500, size: 11, leading: 1, color: p.fgMuted })}>{ticketNumber}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ marginTop: 24, padding: 16, borderRadius: radii.card, backgroundColor: p.sunken, borderWidth: 1, borderColor: p.borderSubtle }}>
            <Text style={type({ weight: 700, size: 14, leading: 1.2, color: p.fg, align: "center" })}>{t("detail.registrationPending")}</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={enterStagger(3)} style={{ width: "100%", marginTop: 16, gap: 10 }}>
        {approved ? (
          <>
            <Btn full variant="primary" iconRight="aright" onPress={onViewTicket}>{t("common.viewTicket")}</Btn>
            <Btn full variant="ghost" onPress={onDone}>{t("regSuccess.done")}</Btn>
          </>
        ) : (
          <Btn full variant="primary" onPress={onDone}>{t("regSuccess.done")}</Btn>
        )}
      </Animated.View>
    </View>
  );
}

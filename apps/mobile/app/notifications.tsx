/**
 * Инбокс участника (CONTRACT_DIFF §3, MOBILE_IMPACT §5).
 *
 * Зеркало организаторского центра (`/org/notifications`), но на личном
 * Account: строка собирается ЗДЕСЬ из `type` и `payload` (словарь
 * `notif.acc.*`) — сервер намеренно не хранит готовую фразу. Тап помечает
 * строку прочитанной (оптимистично) и ведёт на билет/событие/сертификат через
 * тот же `resolvePushTarget`, что и пуш; вести некуда — строка не
 * притворяется кнопкой.
 */
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated from "react-native-reanimated";

import {
  accountNotificationTarget,
  useAccountMarkReadMutation,
  useAccountNotificationsQuery,
  useAccountUnreadCountQuery,
  type AccountNotificationItem,
} from "@entities/account-notifications";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatTime } from "@shared/lib/format";
import { goBack } from "@shared/lib/go-back";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { clearAppBadge, PARTICIPANT_FALLBACK_ROUTE, resolvePushTarget, useAppBadgeSync } from "@shared/notifications";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Body, Btn, Icon, IconBtn, Screen, Spinner, StateBlock, TopBar } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

/** Иконка и тон по поводу — повод читается до текста. */
const META: Record<string, { icon: string; tone: "accent" | "success" | "danger" | "info" }> = {
  REGISTRATION_CREATED: { icon: "ticket", tone: "accent" },
  REGISTRATION_APPROVED: { icon: "check", tone: "success" },
  REGISTRATION_REJECTED: { icon: "x", tone: "danger" },
  REGISTRATION_CANCELLED: { icon: "x", tone: "danger" },
  REGISTRATION_REVOKED: { icon: "alert", tone: "danger" },
  PAYMENT_PENDING: { icon: "card", tone: "accent" },
  PAYMENT_FAILED: { icon: "alert", tone: "danger" },
  HOLD_EXPIRED: { icon: "clock", tone: "info" },
  TICKET_ISSUED: { icon: "ticket", tone: "success" },
  TICKET_REFUNDED: { icon: "wallet", tone: "info" },
  CHECKED_IN: { icon: "check", tone: "success" },
  EVENT_REMINDER: { icon: "clock", tone: "accent" },
  EVENT_STARTING: { icon: "zap", tone: "accent" },
  EVENT_CANCELLED: { icon: "alert", tone: "danger" },
  REGISTRATION_CLOSING: { icon: "clock", tone: "info" },
  FEW_SEATS_LEFT: { icon: "users", tone: "info" },
  EVENT_SUMMARY: { icon: "star", tone: "info" },
  CERTIFICATE_ISSUED: { icon: "award", tone: "success" },
};

/** Ключ словаря: PENDING-вариант REGISTRATION_CREATED — отдельная фраза. */
function phraseKeyOf(item: AccountNotificationItem): StringKey {
  const payload = (item.payload ?? {}) as { pending?: unknown };
  if (item.type === "REGISTRATION_CREATED" && payload.pending === true) {
    return "notif.acc.REGISTRATION_CREATED_PENDING" as StringKey;
  }
  return `notif.acc.${item.type}` as StringKey;
}

function NotificationRow({ item, index, onPress }: { item: AccountNotificationItem; index: number; onPress?: () => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const meta = META[item.type] ?? { icon: "info", tone: "info" as const };
  const TONE = { accent: accent.base, success: p.success, danger: p.danger, info: p.info };
  const unread = !item.readAt;

  // Подстановки, а не готовая фраза с сервера.
  const payload = (item.payload ?? {}) as { eventTitle?: string; reason?: string | null };
  const text = t(phraseKeyOf(item), { event: payload.eventTitle ?? "—" });
  const when = `${formatDateStamp(item.createdAt, lang)}, ${formatTime(item.createdAt, lang)}`;

  const body = (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 13, paddingHorizontal: 14 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.control,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: p.sunken,
        }}
      >
        <Icon name={meta.icon} size={17} sw={2} color={TONE[meta.tone]} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: unread ? 600 : 400, size: 14, leading: 1.35, color: p.fg })}>
          {text}
        </Text>
        {/* Причина отказа/отзыва — вторая строка: участник должен увидеть её,
            не открывая ничего. */}
        {payload.reason ? (
          <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.35, color: p.fgMuted })}>
            {payload.reason}
          </Text>
        ) : null}
        <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle })}>
          {when}
        </Text>
      </View>
      {/* Непрочитанное — точка, а не полосатый фон. */}
      {unread ? <View style={{ width: 8, height: 8, borderRadius: radii.pill, backgroundColor: accent.base, marginTop: 6 }} /> : null}
    </View>
  );

  return (
    <Animated.View entering={enterStagger(Math.min(index, 6))} style={{ borderBottomWidth: 1, borderBottomColor: p.borderSubtle }}>
      {onPress ? (
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={text} haptic="tap" scaleTo={0.99} onPress={onPress}>
          {body}
        </AnimatedPressable>
      ) : (
        body
      )}
    </Animated.View>
  );
}

export default function AccountNotifications(): React.JSX.Element {
  const router = useRouter();
  const { t } = useI18n();
  const { status: authStatus } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const authed = authStatus === "authenticated";
  const q = useAccountNotificationsQuery(authed);
  const unreadQ = useAccountUnreadCountQuery(authed);
  const markRead = useAccountMarkReadMutation();

  // Badge иконки приложения = участнический unread (MOBILE_IMPACT §6);
  // инбокс открыт — цифра своё отработала.
  useAppBadgeSync(unreadQ.data);
  useEffect(() => {
    void clearAppBadge();
  }, []);
  // Счётчик не должен врать после возвращения на экран (паттерн org-дашборда).
  const refetchUnread = unreadQ.refetch;
  useFocusEffect(
    useCallback(() => {
      if (!authed) return;
      void refetchUnread();
      const id = setInterval(() => void refetchUnread(), 60_000);
      return () => clearInterval(id);
    }, [authed, refetchUnread]),
  );

  const rows = q.data?.pages.flatMap((pg) => pg.data) ?? [];
  const unread = q.data?.pages[0]?.unread ?? 0;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (!q.hasNextPage || q.isFetchingNextPage) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 300) void q.fetchNextPage();
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.allSettled([q.refetch(), unreadQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Куда ведёт уведомление: маппинг типа (`accountNotificationTarget`) → тот же
   * парсер, что у пуша, — битые параметры падают в фолбэк, а фолбэк
   * «мы уже в инбоксе» гасится в undefined.
   */
  const targetOf = (item: AccountNotificationItem): (() => void) | undefined => {
    const link = accountNotificationTarget(item);
    if (!link) return undefined;
    const target = resolvePushTarget({ route: link.route, params: link.params }, { shell: "participant" });
    if (target.pathname === PARTICIPANT_FALLBACK_ROUTE) return undefined;
    return () => router.push({ pathname: target.pathname, params: target.params } as never);
  };

  /** Тап: непрочитанное — пометить (оптимистично), затем перейти, если есть куда. */
  const pressOf = (item: AccountNotificationItem): (() => void) | undefined => {
    const go = targetOf(item);
    if (!go && item.readAt) return undefined;
    return () => {
      if (!item.readAt) markRead.mutate([item.id]);
      go?.();
    };
  };

  return (
    <Screen>
      <TopBar
        title={t("notif.title")}
        border
        left={<IconBtn name="cleft" size={40} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />}
        right={
          unread > 0 ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={t("notif.markAll")}
              haptic="tap"
              scaleTo={0.96}
              hitSlop={10}
              onPress={() => markRead.mutate(undefined)}
            >
              <Text style={type({ weight: 600, size: 13, leading: 1, color: accent.ink })}>{t("notif.markAll")}</Text>
            </AnimatedPressable>
          ) : undefined
        }
      />

      <Body
        pad={false}
        onScroll={onScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {!authed ? (
          <View style={{ padding: gutter, paddingTop: 40 }}>
            <StateBlock
              icon="bell"
              title={t("profile.guest.title")}
              body={t("profile.guest.body")}
              action={<Btn size="md" variant="primary" onPress={() => router.push("/login")}>{t("common.signIn")}</Btn>}
            />
          </View>
        ) : q.isPending ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}><Spinner /></View>
        ) : q.isError ? (
          <View style={{ padding: gutter }}>
            <StateBlock
              icon="alert"
              tone="error"
              title={t("state.error.title")}
              body={t("state.error.body")}
              action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>}
            />
          </View>
        ) : rows.length === 0 ? (
          <View style={{ padding: gutter, paddingTop: 40 }}>
            <StateBlock icon="bell" title={t("notif.empty.title")} body={t("notif.acc.empty.body")} />
          </View>
        ) : (
          <View>
            {rows.map((item, i) => (
              <NotificationRow key={item.id} item={item} index={i} onPress={pressOf(item)} />
            ))}
            {q.isFetchingNextPage ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}><Spinner size={22} /></View>
            ) : null}
          </View>
        )}
      </Body>
    </Screen>
  );
}

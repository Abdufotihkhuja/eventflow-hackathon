/**
 * 2.6 · Центр уведомлений.
 *
 * Строка собирается ЗДЕСЬ из `type` и `payload`: сервер намеренно не хранит
 * готовую фразу, потому что ленту читают на трёх языках. Непрочитанное помечено
 * точкой, а не другим фоном — фон делает список полосатым, а точка говорит то
 * же самое одним пикселем.
 *
 * Тап помечает строку прочитанной (оптимистично, BL-36) и ведёт туда, куда
 * указывает уведомление. Если вести некуда и строка уже прочитана — она не
 * притворяется кнопкой.
 */
import { useState } from "react";
import { useRouter } from "expo-router";
import { RefreshControl, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated from "react-native-reanimated";

import {
  useMarkReadMutation,
  useNotificationsQuery,
  type NotificationItem,
} from "@entities/notifications";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatTime } from "@shared/lib/format";
import { goBack } from "@shared/lib/go-back";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { ORG_FALLBACK_ROUTE, resolvePushTarget } from "@shared/notifications";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Body, Btn, Icon, IconBtn, Screen, Spinner, StateBlock, TopBar } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

/** Иконка и тон по поводу — повод читается до текста. */
const META: Record<string, { icon: string; tone: "accent" | "success" | "danger" | "info" }> = {
  REGISTRATION_CREATED: { icon: "user", tone: "accent" },
  REGISTRATION_APPROVED: { icon: "check", tone: "success" },
  REGISTRATION_REJECTED: { icon: "x", tone: "danger" },
  EVENT_PUBLISHED: { icon: "cal", tone: "success" },
  EVENT_REJECTED: { icon: "alert", tone: "danger" },
  MEMBER_JOINED: { icon: "users", tone: "info" },
  ORG_VERIFIED: { icon: "verified", tone: "success" },
  ORG_VERIFICATION_REJECTED: { icon: "alert", tone: "danger" },
  // Программа уведомлений (CONTRACT_DIFF §5):
  EVENT_SUBMITTED: { icon: "doc", tone: "info" },
  EVENT_CHANGES_REQUESTED: { icon: "edit", tone: "accent" },
  REGISTRATION_FIRST: { icon: "zap", tone: "success" },
  CAPACITY_THRESHOLD: { icon: "users", tone: "accent" },
  TICKET_REFUND: { icon: "wallet", tone: "info" },
  REGISTRATION_CLOSED: { icon: "lock", tone: "info" },
  EVENT_SUMMARY: { icon: "star", tone: "info" },
};

/**
 * Куда ведёт тип по каталогу: реестры/аналитика вместо страницы события там,
 * где уведомление про людей и цифры (REG-2x/CLS-03 → участники, SUM-02 →
 * аналитика). Всё остальное с entityType=event — на карточку события.
 */
const TYPE_ROUTES: Partial<Record<string, string>> = {
  REGISTRATION_FIRST: "/org/attendees/[eventId]",
  CAPACITY_THRESHOLD: "/org/attendees/[eventId]",
  TICKET_REFUND: "/org/attendees/[eventId]",
  REGISTRATION_CLOSED: "/org/attendees/[eventId]",
  EVENT_SUMMARY: "/org/analytics/[eventId]",
};

function NotificationRow({ item, index, onPress }: { item: NotificationItem; index: number; onPress?: () => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const meta = META[item.type] ?? { icon: "info", tone: "info" as const };
  const TONE = { accent: accent.base, success: p.success, danger: p.danger, info: p.info };
  const unread = !item.readAt;

  // Подстановки, а не готовая фраза с сервера.
  const payload = (item.payload ?? {}) as {
    eventTitle?: string;
    personName?: string;
    threshold?: number;
    totalCount?: number;
    pendingCount?: number;
  };
  const text = t(`notif.${item.type}` as StringKey, {
    event: payload.eventTitle ?? "—",
    person: payload.personName ?? "—",
    threshold: payload.threshold ?? 0,
    total: payload.totalCount ?? 0,
    pending: payload.pendingCount ?? 0,
  });
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

export default function Notifications(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const { t } = useI18n();
  const { workspace } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const orgId = workspace?.organizationId;
  const q = useNotificationsQuery(orgId);
  const markRead = useMarkReadMutation(orgId);

  // Badge иконки приложения здесь НЕ трогаем: с появлением участнического
  // инбокса цифра на иконке — участнический unread (MOBILE_IMPACT §6), и
  // организаторский центр не имеет права её гасить.

  const gate = useWorkspaceGate();
  if (gate) return gate;

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
      await q.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Куда ведёт уведомление: `entityType` → параметрический маршрут из
   * KNOWN_PUSH_ROUTES, через тот же парсер, что у пуша — битый `entityId`
   * падает в фолбэк, а фолбэк «мы уже в инбоксе» гасится в undefined.
   * Все нынешние типы с маршрутом (REGISTRATION_*, EVENT_*) несут событие;
   * MEMBER_JOINED / ORG_VERIFIED* вести некуда.
   */
  const targetOf = (item: NotificationItem): (() => void) | undefined => {
    if (item.entityType !== "event" || !item.entityId) return undefined;
    const route = TYPE_ROUTES[item.type] ?? "/org/event/[id]";
    const paramName = route.includes("[eventId]") ? "eventId" : "id";
    const target = resolvePushTarget({ route, params: { [paramName]: item.entityId } }, { shell: "org" });
    if (target.pathname === ORG_FALLBACK_ROUTE) return undefined;
    return () => router.push({ pathname: target.pathname, params: target.params } as never);
  };

  /** Тап: непрочитанное — пометить (оптимистично), затем перейти, если есть куда. */
  const pressOf = (item: NotificationItem): (() => void) | undefined => {
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
        left={<IconBtn name="cleft" size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />}
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
        {q.isPending ? (
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
            <StateBlock icon="bell" title={t("notif.empty.title")} body={t("notif.empty.body")} />
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

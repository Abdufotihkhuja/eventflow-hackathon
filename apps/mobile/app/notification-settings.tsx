import { useEffect } from "react";
import { useRouter } from "expo-router";
import { AppState, View } from "react-native";

import {
  useNotificationPreferencesQuery,
  useUpdatePreferenceMutation,
  type PreferenceChannel,
  type PreferenceKey,
  type PreferenceRow,
} from "@entities/notifications";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { AnimatedPressable } from "@shared/motion";
import { useNotificationPermission } from "@shared/notifications";
import { accent, radii, usePalette } from "@shared/theme";
import {
  Banner, Body, Btn, Icon, IconBtn, Screen, SettingsGroup, SettingsRow, Skeleton,
  StateBlock, TopBar, useMutationError,
} from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

/** iOS-style switch, the design's 51×31 (same recipe as org/event-form). */
function Toggle({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      haptic="select"
      scaleTo={0.94}
      onPress={onPress}
      style={{
        width: 51,
        height: 31,
        borderRadius: radii.pill,
        padding: 2,
        backgroundColor: on ? accent.base : p.borderStrong,
        alignItems: on ? "flex-end" : "flex-start",
        justifyContent: "center",
      }}
    >
      <View style={{ width: 27, height: 27, borderRadius: radii.pill, backgroundColor: "#fff" }} />
    </AnimatedPressable>
  );
}

/**
 * Notification settings (BL-21) — the preference matrix, key × push/email.
 *
 * The server owns the matrix: GET returns EVERY key with effective values
 * (including the locked `transactional` row), so the screen renders exactly
 * what came back and never invents defaults. Toggles flip optimistically and
 * roll back with a spoken reason on failure (entities/notifications).
 *
 * Reached from both shells' settings lists, hence the workspace-aware back
 * fallback — a deep link must not strand an organizer in the participant feed.
 */
export default function NotificationSettings(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t } = useI18n();
  const { workspace } = useAuth();
  const permission = useNotificationPermission();

  const matrixQ = useNotificationPreferencesQuery();
  const update = useUpdatePreferenceMutation();
  const onError = useMutationError();

  // Coming back from system settings must refresh the "off in the system"
  // banner — the user just went there specifically to flip that switch.
  const refreshPermission = permission.refresh;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPermission();
    });
    return () => sub.remove();
  }, [refreshPermission]);

  const rows = matrixQ.data ?? [];
  const lockedRows = rows.filter((r) => r.locked);
  const editableRows = rows.filter((r) => !r.locked && r.key !== "transactional");

  function toggle(row: PreferenceRow, channel: PreferenceChannel): void {
    update.mutate(
      { key: row.key as PreferenceKey, channel, enabled: !row[channel] },
      { onError },
    );
  }

  function channelRow(row: PreferenceRow, channel: PreferenceChannel, last?: boolean): React.JSX.Element {
    const label = t(`notifSettings.channel.${channel}` as StringKey);
    return (
      <SettingsRow
        icon={channel === "push" ? "bell" : "mail"}
        label={label}
        last={last}
        trailing={<Toggle on={row[channel]} label={label} onPress={() => toggle(row, channel)} />}
      />
    );
  }

  let content: React.ReactNode;
  if (matrixQ.isPending) {
    content = (
      <View style={{ gap: 14, marginTop: 8 }}>
        <Skeleton w="100%" h={104} />
        <Skeleton w="100%" h={104} />
        <Skeleton w="100%" h={104} />
      </View>
    );
  } else if (matrixQ.isError) {
    content = (
      <View style={{ paddingVertical: 28 }}>
        <StateBlock
          icon="alert"
          title={t("state.error.title")}
          action={<Btn size="md" variant="secondary" onPress={() => void matrixQ.refetch()}>{t("common.retry")}</Btn>}
        />
      </View>
    );
  } else {
    content = (
      <>
        {lockedRows.length > 0 ? (
          <SettingsGroup first title={t("notifSettings.lockedTitle")}>
            {lockedRows.map((row, i) => (
              <SettingsRow
                key={row.key}
                icon="lock"
                label={row.key === "transactional" ? t("notifChannel.transactional") : t(`notifSettings.key.${row.key}` as StringKey)}
                sub={t("notifSettings.lockedHint")}
                trailing={<Icon name="lock" size={16} color={p.fgSubtle} />}
                last={i === lockedRows.length - 1}
              />
            ))}
          </SettingsGroup>
        ) : null}

        {editableRows.map((row) => (
          <SettingsGroup key={row.key} title={t(`notifSettings.key.${row.key}` as StringKey)}>
            {channelRow(row, "push")}
            {channelRow(row, "email", true)}
          </SettingsGroup>
        ))}
      </>
    );
  }

  return (
    <Screen>
      <TopBar
        title={t("notifSettings.title")}
        border
        left={<IconBtn name="cleft" size={40} onPress={() => goBack(router, workspace ? "/org/profile" : "/profile")} accessibilityLabel={t("a11y.back")} />}
      />
      <Body contentStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        {permission.state === "denied" ? (
          <View style={{ marginBottom: 16 }}>
            <Banner tone="info" action={t("notifPerm.openSettings")} onAction={permission.openSystemSettings}>
              {t("notifPerm.denied.body")}
            </Banner>
          </View>
        ) : null}
        {content}
      </Body>
    </Screen>
  );
}

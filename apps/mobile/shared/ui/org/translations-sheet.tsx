/**
 * 2.2 · Translations sheet — per-locale copies of one plain-text event field.
 *
 * The design's original idea was three language TABS inside each field. On a
 * phone that fails twice: the tab strip eats the field's own width, and a tab
 * silently hides whether the other locales are filled — the one thing the
 * author needs to know. So the field keeps a compact locale summary, and the
 * actual editing happens here, where all three locales are visible at once and
 * each one states its own status.
 *
 * The host locale is whichever language the author typed the field in; its text
 * is the top-level event field, so it is shown read-only and is the source for
 * machine translation.
 */
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { EVENT_LOCALES, translateFields, type EventLocale, type TranslatableField } from "@entities/org-events";
import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";

import { BottomSheet } from "../bottom-sheet";
import { Btn } from "../button";
import { Icon } from "../icon";

import type { StringKey } from "@shared/i18n/strings";

const LOCALE_LABEL: Record<EventLocale, StringKey> = {
  ru: "lang.ru",
  uz: "lang.uz",
  en: "lang.en",
};

/** How many of the three locales carry text (host counts as filled). */
export function filledCount(host: string, values: Partial<Record<EventLocale, string>>): number {
  let n = host.trim() ? 1 : 0;
  for (const l of EVENT_LOCALES) if (values[l]?.trim()) n += 1;
  return n;
}

/** Compact "RU UZ EN" summary that sits on the field itself. Each chip states
 *  whether that locale has text — which a tab strip could never show. */
export function LocaleSummary({
  hostLocale, host, values, onPress,
}: {
  hostLocale: EventLocale;
  host: string;
  values: Partial<Record<EventLocale, string>>;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={t("org.form.tr.open")}
      haptic="tap"
      scaleTo={0.97}
      hitSlop={6}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
    >
      {EVENT_LOCALES.map((l) => {
        const isHost = l === hostLocale;
        const on = isHost ? !!host.trim() : !!values[l]?.trim();
        return (
          <View
            key={l}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 4,
              borderRadius: radii.sm,
              backgroundColor: on ? (isHost ? p.inverse : p.sunken) : "transparent",
              borderWidth: on ? 0 : 1,
              borderColor: p.border,
            }}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={type({
                role: "mono",
                weight: 600,
                size: 10,
                leading: 1,
                color: on ? (isHost ? p.fgInverse : p.fgDefault) : p.fgSubtle,
                transform: "uppercase",
              })}
            >
              {l}
            </Text>
          </View>
        );
      })}
      <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 11, leading: 1, color: accent.base })}>
        {t("org.form.tr.edit")}
      </Text>
    </AnimatedPressable>
  );
}

export function TranslationsSheet({
  visible, onClose, field, label, hostLocale, host, values, onChange,
}: {
  visible: boolean;
  onClose: () => void;
  field: TranslatableField;
  /** Human name of the field being translated ("Название события"). */
  label: string;
  hostLocale: EventLocale;
  /** The host-locale text — read-only here, and the translation source. */
  host: string;
  values: Partial<Record<EventLocale, string>>;
  onChange: (next: Partial<Record<EventLocale, string>>) => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const [draft, setDraft] = useState(values);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Re-seed whenever the sheet opens so a cancel really discards.
  useEffect(() => {
    if (visible) {
      setDraft(values);
      setFailed(false);
    }
    // `values` deliberately omitted: re-seeding on every keystroke upstream
    // would fight the user's edits inside the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const targets = EVENT_LOCALES.filter((l) => l !== hostLocale);
  const empty = targets.filter((l) => !draft[l]?.trim());

  const onTranslate = async (): Promise<void> => {
    if (!host.trim() || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await translateFields(hostLocale, empty.length > 0 ? empty : targets, [{ fieldKey: field, text: host }]);
      const got = res[field] ?? {};
      if (Object.keys(got).length === 0) {
        setFailed(true);
        haptics.warn();
        return;
      }
      setDraft((d) => ({ ...d, ...got }));
      haptics.success();
    } catch {
      setFailed(true);
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  const done = (): void => {
    onChange(draft);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.88} closeLabel={t("common.close")}>
      <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
              {t("org.form.tr.title")}
            </Text>
            <Text numberOfLines={1} style={[type({ role: "mono", weight: 500, size: 11, leading: 1, color: p.fgMuted }), { marginTop: 4 }]}>
              {label} · {t("org.form.tr.count", { n: filledCount(host, draft), total: EVENT_LOCALES.length })}
            </Text>
          </View>
          <Btn size="sm" variant="primary" onPress={done}>{t("common.done")}</Btn>
        </View>

        {/* Machine translation — labelled with the provider, because an author
            must be able to tell an auto string from one they wrote. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Btn
            size="sm"
            variant="secondary"
            icon="globe"
            loading={busy}
            disabled={!host.trim() || targets.length === 0}
            onPress={() => void onTranslate()}
          >
            {empty.length > 0 ? t("org.form.tr.fillEmpty") : t("org.form.tr.redo")}
          </Btn>
          {failed ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Icon name="alert" size={14} sw={2} color={p.danger} />
              <Text style={[type({ weight: 500, size: 12, leading: 1.3, color: p.danger }), { flex: 1 }]}>{t("org.form.tr.failed")}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          {EVENT_LOCALES.map((l) => {
            const isHost = l === hostLocale;
            const value = isHost ? host : (draft[l] ?? "");
            return (
              <View key={l} style={{ gap: 7 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={type({ weight: 600, size: 13, leading: 1, color: p.fgDefault })}>{t(LOCALE_LABEL[l])}</Text>
                  {isHost ? (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: radii.sm, backgroundColor: p.inverse }}>
                      <Text style={type({ role: "mono", weight: 600, size: 9, leading: 1, track: 0.06, color: p.fgInverse, transform: "uppercase" })}>
                        {t("org.form.tr.host")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TextInput
                  value={value}
                  editable={!isHost}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [l]: v }))}
                  placeholder={isHost ? undefined : t("org.form.tr.placeholder")}
                  placeholderTextColor={p.fgSubtle}
                  multiline
                  accessibilityLabel={`${label} — ${t(LOCALE_LABEL[l])}`}
                  style={[
                    type({ weight: 400, size: 15, leading: 1.4, color: isHost ? p.fgMuted : p.fg }),
                    {
                      minHeight: 48,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: radii.control,
                      backgroundColor: isHost ? p.sunken : p.surface,
                      borderWidth: 1,
                      borderColor: p.border,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

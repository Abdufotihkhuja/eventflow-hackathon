/**
 * DateTimeField (native — iOS/Android) — a Field-styled trigger that opens the
 * platform date/time picker via `@react-native-community/datetimepicker`.
 *
 * NB: `@react-native-community/datetimepicker` is deliberately NOT in
 * apps/mobile/package.json — it resolves through the root node_modules symlink
 * (like the sdk-workspace pattern), and the package ships NO web build, so this
 * file is native-only. The `.web.tsx` sibling replaces it on web with a plain
 * `<input type="date|time">` (Metro platform-extension resolution). Never import
 * this module path directly expecting web behavior — import from `@shared/ui`.
 *
 * Android renders Material 3 dialogs (`design: 'material'` via the imperative
 * `DateTimePickerAndroid.open`, per the cheap-Android adaptation rule); iOS
 * mounts the inline/compact picker in a bottom sheet.
 */
import { useRef, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import RNDateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { useI18n } from "@shared/i18n";
import { accent, radii, type, usePalette } from "@shared/theme";

import { Btn } from "../button";
import { Icon } from "../icon";

export interface DateTimeFieldProps {
  label: string;
  mode: "date" | "time";
  /** Selected value; `null` renders the placeholder. */
  value: Date | null;
  onChange: (next: Date) => void;
  icon?: string;
  placeholder?: string;
  error?: string;
  /** Earliest selectable date (e.g. now, for a future-date rule). */
  minimumDate?: Date;
  /** Latest selectable date (e.g. the event start, for a deadline field). */
  maximumDate?: Date;
}

export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  icon,
  placeholder,
  error,
  minimumDate,
  maximumDate,
}: DateTimeFieldProps): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const [iosOpen, setIosOpen] = useState(false);
  // What the iOS wheel is CURRENTLY showing. The picker only fires `onChange`
  // when the selection actually moves, so opening the sheet on today's date and
  // pressing «Продолжить» used to commit nothing — the field stayed empty and
  // the form then complained about a date the author could plainly see.
  // «Продолжить» must commit what is on screen, moved or not.
  const iosDraft = useRef<Date | null>(null);
  // The value the picker edits — falls back to the min date, else now, so a
  // fresh field still opens on a sane day.
  const initial = value ?? minimumDate ?? new Date();

  const display = formatDisplay(value, mode, lang, placeholder);

  const openAndroid = (): void => {
    DateTimePickerAndroid.open({
      value: initial,
      mode,
      is24Hour: true,
      minimumDate,
      maximumDate,
      design: "material",
      onChange: (event: DateTimePickerEvent, next?: Date) => {
        if (event.type === "set" && next) onChange(next);
      },
    });
  };

  const open = (): void => {
    if (Platform.OS === "android") openAndroid();
    else setIosOpen(true);
  };

  const border = error ? p.danger : p.border;

  return (
    <View style={{ flex: 1 }}>
      <Text
        style={[
          type({ weight: 600, size: 11, leading: 1, track: 0.04, color: error ? p.danger : p.fgMuted, transform: "uppercase" }),
          { marginBottom: 8 },
        ]}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `, ${display}` : ""}`}
        onPress={open}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: 50,
          paddingHorizontal: 14,
          borderRadius: radii.control,
          backgroundColor: p.isDark ? "rgba(255,255,255,0.05)" : p.surface,
          borderWidth: 1.5,
          borderColor: border,
        }}
      >
        {icon ? <Icon name={icon} size={18} color={p.fgSubtle} /> : null}
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[type({ weight: 500, size: 15, color: value == null ? p.fgMuted : p.fg }), { flex: 1 }]}
        >
          {display}
        </Text>
      </Pressable>
      {error ? (
        <Text style={[type({ weight: 500, size: 12, leading: 1.4, color: p.danger }), { marginTop: 7 }]}>{error}</Text>
      ) : null}

      {/* iOS: inline picker in a bottom sheet with a Done button. */}
      {Platform.OS === "ios" ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(14,14,13,0.56)" }} onPress={() => setIosOpen(false)} />
          <View style={{ backgroundColor: p.surface, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 }}>
            {/* iOS reads 24-hour from the device locale; `is24Hour` is an
                Android/Windows-only prop, so it is set only in the Android
                imperative open() above. */}
            <RNDateTimePicker
              value={initial}
              mode={mode}
              display="inline"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              accentColor={accent.base}
              themeVariant={p.isDark ? "dark" : "light"}
              onChange={(_e: DateTimePickerEvent, next?: Date) => {
                if (!next) return;
                iosDraft.current = next;
                onChange(next);
              }}
            />
            <Btn
              full
              variant="primary"
              onPress={() => {
                onChange(iosDraft.current ?? initial);
                iosDraft.current = null;
                setIosOpen(false);
              }}
            >
              {t("common.continue")}
            </Btn>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function localeOf(lang: string): string {
  if (lang === "ru") return "ru-RU";
  if (lang === "uz") return "uz-UZ";
  return "en-US";
}

/** Trigger label: placeholder when empty, else a localized date or 24h time. */
function formatDisplay(value: Date | null, mode: "date" | "time", lang: string, placeholder?: string): string {
  if (value == null) return placeholder ?? "";
  const opts: Intl.DateTimeFormatOptions =
    mode === "date"
      ? { weekday: "short", day: "numeric", month: "short" }
      : { hour: "2-digit", minute: "2-digit", hour12: false };
  return new Intl.DateTimeFormat(localeOf(lang), opts).format(value);
}

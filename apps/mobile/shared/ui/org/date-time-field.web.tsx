/**
 * DateTimeField (web) — the react-native-web replacement for the native
 * `date-time-field.tsx`. `@react-native-community/datetimepicker` ships no web
 * build, so on the Expo web verification surface we render a real DOM
 * `<input type="date|time">` (react-native-web IS the DOM). It uses the
 * browser's native date/time picker, is fully keyboard-accessible, and can
 * never crash the bundle. Styled to echo the Field look.
 *
 * The DOM `<input>` is created via `React.createElement("input", …)` — RN's
 * element types don't include `"input"`, but on web this resolves to the real
 * element. This file is never bundled on iOS/Android (platform extension).
 */
import { createElement } from "react";
import { Text, View } from "react-native";

import { accent, radii, type, usePalette } from "@shared/theme";

import { Icon } from "../icon";

import type { DateTimeFieldProps } from "./date-time-field";

/** Date → "YYYY-MM-DD" in LOCAL time (input[type=date] expects local Y-M-D). */
function toDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date → "HH:MM" in local time. */
function toTimeValue(d: Date): string {
  const h = `${d.getHours()}`.padStart(2, "0");
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${h}:${min}`;
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
}: DateTimeFieldProps): React.JSX.Element {
  const p = usePalette();
  const border = error ? p.danger : p.border;

  const handleChange = (e: { target: { value: string } }): void => {
    const raw = e.target.value;
    if (!raw) return;
    if (mode === "date") {
      const [y, m, d] = raw.split("-").map((n) => Number(n));
      const base = value ? new Date(value) : new Date();
      base.setFullYear(y, (m ?? 1) - 1, d ?? 1);
      onChange(base);
    } else {
      const [h, min] = raw.split(":").map((n) => Number(n));
      const base = value ? new Date(value) : new Date();
      base.setHours(h ?? 0, min ?? 0, 0, 0);
      onChange(base);
    }
  };

  let inputValue = "";
  if (value) inputValue = mode === "date" ? toDateValue(value) : toTimeValue(value);

  // Real DOM input, styled to sit inside our field chrome. `colorScheme` lets
  // the browser tint its own picker for dark surfaces.
  const input = createElement("input", {
    type: mode,
    value: inputValue,
    onChange: handleChange,
    min: mode === "date" && minimumDate ? toDateValue(minimumDate) : undefined,
    "aria-label": label,
    placeholder,
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      font: "inherit",
      fontFamily: "inherit",
      fontSize: 15,
      fontWeight: 500,
      color: value == null ? p.fgMuted : p.fg,
      colorScheme: p.isDark ? "dark" : "light",
      padding: 0,
      accentColor: accent.base,
    },
  });

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
      <View
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
        {input}
      </View>
      {error ? (
        <Text style={[type({ weight: 500, size: 12, leading: 1.4, color: p.danger }), { marginTop: 7 }]}>{error}</Text>
      ) : null}
    </View>
  );
}

/**
 * PasswordStrength — the design's `PwReqs`: a 5-segment strength bar plus a
 * two-column checklist of the five password requirements, lit as they're met.
 *
 * The rules mirror the server's `RegisterUserDto` regex
 * (`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$`) so client validation
 * and the backend agree. Screens call `passwordValid()` to gate submit instead
 * of re-declaring the regex.
 */
import { View, Text } from "react-native";

import { type, usePalette } from "@shared/theme";
import { useI18n } from "@shared/i18n";
import type { StringKey } from "@shared/i18n/strings";

import { Icon } from "./icon";

export interface PwChecks {
  len: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
}

export function passwordChecks(pw: string): PwChecks {
  return {
    len: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[@$!%*?&]/.test(pw),
  };
}

export function passwordValid(pw: string): boolean {
  const c = passwordChecks(pw);
  return c.len && c.lower && c.upper && c.digit && c.special;
}

const REQS: { key: keyof PwChecks; label: StringKey }[] = [
  { key: "len", label: "auth.pw.req.len" },
  { key: "lower", label: "auth.pw.req.lower" },
  { key: "upper", label: "auth.pw.req.upper" },
  { key: "digit", label: "auth.pw.req.digit" },
  { key: "special", label: "auth.pw.req.special" },
];

export function PasswordStrength({ value }: { value: string }): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const checks = passwordChecks(value);
  const ok = Object.values(checks).filter(Boolean).length;

  const barColor = ok <= 2 ? p.danger : ok <= 4 ? p.warning : p.forest;
  const track = p.isDark ? "rgba(255,255,255,0.12)" : p.muted;
  const label = ok === 0 ? null : ok <= 2 ? t("auth.pw.weak") : ok <= 4 ? t("auth.pw.fair") : t("auth.pw.strong");

  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 11 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: i < ok ? barColor : track }}
          />
        ))}
        {label ? (
          <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 600, size: 11, leading: 1, color: barColor }), { marginLeft: 4, minWidth: 48, textAlign: "right" }]}>
            {label}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {REQS.map(({ key, label: reqLabel }) => {
          const on = checks[key];
          return (
            <View key={key} style={{ width: "50%", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4, paddingRight: 8 }}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: on ? p.forest : "transparent",
                  borderWidth: on ? 0 : 1.5,
                  borderColor: p.border,
                }}
              >
                {on ? <Icon name="check" size={10} color="#fff" sw={3} /> : null}
              </View>
              <Text maxFontSizeMultiplier={1.6} style={[type({ weight: 500, size: 12, leading: 1.25, color: on ? p.fg : p.fgMuted }), { flex: 1 }]}>
                {t(reqLabel)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

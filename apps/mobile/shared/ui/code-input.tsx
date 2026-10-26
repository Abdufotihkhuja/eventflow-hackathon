/**
 * CodeInput — the design's segmented 6-digit code field (`CodeCells`), but a
 * real controlled input. A single transparent `<TextInput>` overlays the cells
 * and owns the value; tapping anywhere focuses it and the OS number pad drives
 * entry. Cells render the active/filled/error/success states from the kit, and
 * the row shakes once when `error` flips true.
 *
 * Used by Verify (email) and Reset password.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, TextInput, View, type TextInput as RNTextInput } from "react-native";
import Reanimated from "react-native-reanimated";

import { haptics } from "@shared/lib/haptics";
import { popIn, useReducedMotion } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";

export interface CodeInputProps {
  value: string;
  onChangeText: (code: string) => void;
  length?: number;
  error?: boolean;
  success?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
  accessibilityLabel?: string;
}

export function CodeInput({
  value,
  onChangeText,
  length = 6,
  error = false,
  success = false,
  autoFocus,
  onComplete,
  accessibilityLabel,
}: CodeInputProps): React.JSX.Element {
  const p = usePalette();
  const inputRef = useRef<RNTextInput>(null);
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const shake = useRef(new Animated.Value(0)).current;

  // Shake once each time we transition into the error state — with the
  // "wrong passcode" error haptic fired at the exact same moment. Under
  // reduced motion the row stays still but the haptic still lands.
  useEffect(() => {
    if (!error) return;
    haptics.error();
    if (reduced) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [error, reduced, shake]);

  const handle = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, length);
    onChangeText(next);
    if (next.length === length) onComplete?.(next);
  };

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] });

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityRole="none">
      <Animated.View style={{ flexDirection: "row", gap: 9, transform: [{ translateX }] }}>
        {Array.from({ length }).map((_, i) => {
          const ch = value[i];
          const isActive = focused && !error && !success && value.length < length && i === value.length;
          const border = error
            ? p.danger
            : success
              ? p.forest
              : isActive
                ? accent.base
                : ch
                  ? p.borderStrong
                  : p.border;
          const bg = success
            ? p.forestSoft
            : error
              ? p.dangerSoft
              : p.isDark
                ? "rgba(255,255,255,0.05)"
                : p.surface;
          const fg = error ? p.danger : success ? p.forestSoftFg : p.fg;
          return (
            <View
              key={i}
              style={[
                {
                  flex: 1,
                  height: 58,
                  borderRadius: radii.control,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderWidth: 1.5,
                  borderColor: border,
                },
                isActive
                  ? { shadowColor: accent.base, shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } }
                  : null,
              ]}
            >
              {ch ? (
                // Remounts when the digit lands → efPop scale-in per entry.
                // Android: no entering animation — Reanimated's entering can
                // fail to fire there (new arch), leaving the digit stuck at
                // the animation's initial scale/opacity 0, i.e. INVISIBLE.
                <Reanimated.View entering={Platform.OS === "android" ? undefined : popIn()}>
                  <Animated.Text maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 24, leading: 1, color: fg })}>{ch}</Animated.Text>
                </Reanimated.View>
              ) : isActive ? (
                <View style={{ width: 2, height: 24, borderRadius: 2, backgroundColor: accent.base }} />
              ) : null}
            </View>
          );
        })}
      </Animated.View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handle}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        caretHidden
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
      />
    </Pressable>
  );
}

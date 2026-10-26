/**
 * Toast — transient feedback in the app's design language: an ink pill with
 * bone text floating above the tab bar. One toast at a time; extra calls
 * queue. Auto-dismisses after `dur.toast` (~3.5s); tap dismisses early.
 *
 * Announced politely to screen readers; works on web (no Alert). Mount
 * `ToastProvider` once at the root; screens call `useToast().show(...)`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { bannerIn, bannerOut, dur } from "@shared/motion";
import { gutter, light, radii, shadow, type } from "@shared/theme";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastValue {
  /** Show a toast (queued if one is already visible). */
  show: (message: string) => void;
}

const ToastCtx = createContext<ToastValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: PropsWithChildren): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const current = queue[0];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setQueue((q) => q.slice(1));
  }, []);

  useEffect(() => {
    if (!current) return;
    timer.current = setTimeout(() => setQueue((q) => q.slice(1)), dur.toast);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [current]);

  const show = useCallback((message: string) => {
    setQueue((q) => [...q, { id: nextId++, message }]);
  }, []);

  const value = useMemo<ToastValue>(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {current ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Clears the translucent tab bar / action bar on every screen.
            bottom: insets.bottom + 76,
            alignItems: "center",
            paddingHorizontal: gutter,
          }}
        >
          <Animated.View key={current.id} entering={bannerIn()} exiting={bannerOut()}>
            <Pressable
              // role="status" → a POLITE live region on web (aria-live=polite),
              // matching `accessibilityLiveRegion="polite"`; the old
              // accessibilityRole="alert" forced an ASSERTIVE region that
              // fought it. A toast is transient, non-critical feedback and must
              // never interrupt. (`role` is the W3C-aligned prop; "status" is
              // not a valid `accessibilityRole` value.)
              role="status"
              accessibilityLiveRegion="polite"
              onPress={dismiss}
              style={[
                {
                  maxWidth: 520,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: radii.control,
                  backgroundColor: light.inverse,
                },
                shadow.md,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={3}
                style={type({ weight: 600, size: 13, leading: 1.35, color: light.fgInverse, align: "center" })}
              >
                {current.message}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/**
 * Screen / Body / ActionBar — the per-screen shell.
 *
 * `Screen` sets the active palette for its subtree (so `dark` screens recolor
 * every child without prop-drilling), paints the background, and drives the OS
 * status bar. `Body` is the scroll region (hidden scrollbar, page gutter).
 * `ActionBar` is the frosted sticky footer for primary actions.
 */
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import {
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PaletteProvider, gutter, usePalette } from "@shared/theme";

export function Screen({
  children, dark, bg, style,
}: {
  children: React.ReactNode;
  dark?: boolean;
  bg?: string;
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <PaletteProvider dark={dark}>
      <ScreenInner bg={bg} style={style}>
        {children}
      </ScreenInner>
    </PaletteProvider>
  );
}

function ScreenInner({ children, bg, style }: { children: React.ReactNode; bg?: string; style?: ViewStyle }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={[{ flex: 1, backgroundColor: bg ?? p.canvas }, style]}>
      <StatusBar style={p.isDark ? "light" : "dark"} />
      {children}
    </View>
  );
}

/** The floating tab capsule overlays the scroller, so tab screens must leave a
 *  band clear at the bottom or the last row sits under the glass. Mirrors
 *  `FLOATING_TAB_BAR_SPACE` in the tabs layout. */
export const TAB_BAR_CLEARANCE = 72;

export function Body({
  children, pad = true, contentStyle, style, bounce = true, keyboard = false,
  scrollRef, refreshControl, onScroll, dismissKeyboardOnDrag = false, tabBarClearance = false,
}: {
  children: React.ReactNode;
  pad?: boolean;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
  bounce?: boolean;
  /** Set on the four tab screens: adds room for the floating tab capsule. */
  tabBarClearance?: boolean;
  /** Form screens: keep taps/keyboard alive between fields + scroll clear of the keyboard. */
  keyboard?: boolean;
  /** Scroll handle for tab re-tap scroll-to-top (`useScrollToTop`) etc. */
  scrollRef?: React.RefObject<ScrollView | null>;
  /** Pull-to-refresh (pass an ember-tinted `RefreshControl`). */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Scroll listener (e.g. near-end pagination triggers). */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Result lists under a keyboard: drag scrolls the keyboard away. */
  dismissKeyboardOnDrag?: boolean;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  let dismissMode: "none" | "on-drag" | undefined;
  if (keyboard) dismissMode = "none";
  else if (dismissKeyboardOnDrag) dismissMode = "on-drag";
  return (
    <ScrollView
      ref={scrollRef}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[
        {
          paddingHorizontal: pad ? gutter : 0,
          paddingBottom: insets.bottom + 24 + (tabBarClearance ? TAB_BAR_CLEARANCE : 0),
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      bounces={bounce}
      refreshControl={refreshControl}
      onScroll={onScroll}
      scrollEventThrottle={onScroll ? 32 : undefined}
      keyboardShouldPersistTaps={keyboard ? "always" : "handled"}
      keyboardDismissMode={dismissMode}
      automaticallyAdjustKeyboardInsets={keyboard}
    >
      {children}
    </ScrollView>
  );
}

export function ActionBar({ children }: { children: React.ReactNode }): React.JSX.Element {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      intensity={28}
      tint={p.isDark ? "dark" : "light"}
      style={{
        paddingHorizontal: gutter,
        paddingTop: 14,
        paddingBottom: Math.max(insets.bottom, 16),
        borderTopWidth: 1,
        borderTopColor: p.borderSubtle,
        backgroundColor: p.isDark ? "rgba(25,25,24,0.82)" : "rgba(251,251,250,0.86)",
      }}
    >
      {children}
    </BlurView>
  );
}

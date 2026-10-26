import { useEffect } from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { AppProviders } from "@shared/providers/app-providers";
import { installCrashHandlers } from "@shared/lib/crash";
import { installNavGuard } from "@shared/lib/nav-guard";
import { ShimmerProvider } from "@shared/motion";
import { installNotificationHandler, NotificationsBridge } from "@shared/notifications";
import { dark, light, useAppFonts } from "@shared/theme";
import { AppErrorBoundary, SPLASH_BG, ToastProvider } from "@shared/ui";

// Route uncaught JS errors to the crash seam (FND-19) as early as possible.
installCrashHandlers();
// Rapid double-taps must not push the same route twice.
installNavGuard();
// Foreground push presentation policy (BL-15) — must be set before any push
// can arrive, same "install at module scope" pattern as the two above.
installNotificationHandler();

// Hold the OS splash until the brand fonts are in, then cross-fade into our own
// animated hold. Without this the first frame is a bare canvas between the two.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
void SplashScreen.setOptions({ duration: 260, fade: true });

/**
 * Root layout: load the brand fonts (Manrope / Space Grotesk / JetBrains Mono),
 * then mount providers + the navigation stack. While fonts load we hold on a
 * bone canvas to avoid a flash of fallback type (expo-splash-screen isn't a
 * dependency, so the OS splash can't be held programmatically — the bone hold
 * is the next best thing).
 *
 * W0: ShimmerProvider (single skeleton clock) + ToastProvider mount here;
 * dark-canvas routes override `contentStyle` so pushing them never flashes
 * the bone background at the screen edges.
 */
export default function RootLayout(): React.JSX.Element {
  const [fontsLoaded] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  return (
    <AppProviders>
      <ShimmerProvider>
        <ToastProvider>
          {fontsLoaded ? (
            <AppErrorBoundary>
              {/* Push-ядро: каналы, provisional, cold-start и listeners тапов.
                  Сидит РЯДОМ со Stack, чтобы существовать только когда
                  навигатор смонтирован — навигация из пуша не может стрельнуть
                  в пустоту (BL-15). */}
              <NotificationsBridge />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: light.canvas },
                  animation: "slide_from_right",
                  // Swipe-back everywhere, and from anywhere on the screen —
                  // not just the ~20pt edge strip the native default listens to.
                  // react-native-screens yields to horizontal scrollers, so the
                  // featured rail and the detail sub-nav still scroll normally.
                  gestureEnabled: true,
                  fullScreenGestureEnabled: true,
                }}
              >
                {/* The tab root owns horizontal drags — that is how you page
                    between tabs. There is nothing behind it to pop to anyway,
                    so the stack's back gesture would only fight the pager. */}
                <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
                {/* Same for the organizer workspace: its own tab pager owns
                    horizontal drags. Left enabled, the root stack swallowed
                    them trying to pop the whole workspace. Screens pushed
                    *inside* it keep their back gesture — that stack is separate. */}
                <Stack.Screen name="org" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
                {/* The map pans horizontally: every drag west was popping the
                    screen instead of moving the map, so the whole surface was
                    unusable. No swipe-back here at all — the back button in the
                    header is the way out, which is what map screens do anyway. */}
                <Stack.Screen name="map" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
                {/* Dark screens paint their own backdrop during the push transition. */}
                <Stack.Screen name="ticket/[id]" options={{ contentStyle: { backgroundColor: dark.canvas } }} />
              </Stack>
            </AppErrorBoundary>
          ) : (
            // Fonts are not in yet, so the splash's display type would render in
            // a fallback face and then swap. Hold on its background colour only
            // — the real screen takes over on the very next frame, seamlessly.
            <View style={{ flex: 1, backgroundColor: SPLASH_BG }} />
          )}
        </ToastProvider>
      </ShimmerProvider>
    </AppProviders>
  );
}

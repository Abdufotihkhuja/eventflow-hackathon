import { Stack } from "expo-router";

import { dark, light } from "@shared/theme";

/** Organizer workspace stack (W6 restructure of the old `/workspace` group).
 *  `(tabs)` hosts the OrgTabBar surfaces (overview / events / guests / org);
 *  the scanner, attendee management, the event manage screen, the create/edit
 *  form, and the submit-review success moment push over them. The scanner is a
 *  dark surface — its contentStyle matches so pushing it never flashes bone at
 *  the edges (W0 dark-flash fix). The form presents modally (W7). */
export default function OrgLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: light.canvas },
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {/* The tab root owns horizontal drags — that is how you page between
          tabs — and there is nothing behind it to pop to. */}
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      <Stack.Screen
        name="scan"
        options={{ contentStyle: { backgroundColor: dark.canvasDeep ?? dark.canvas } }}
      />
      {/* Rows here carry their own horizontal swipe (approve / reject, design
          4.8). The stack's full-screen back gesture is a NATIVE recognizer and
          wins over the row's JS PanResponder anywhere on the screen, so a swipe
          meant to approve popped the screen instead. Keep the standard edge
          back-swipe, drop the full-width one. */}
      <Stack.Screen name="attendees/[eventId]" options={{ fullScreenGestureEnabled: false }} />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="event/submitted" options={{ gestureEnabled: false }} />
      <Stack.Screen name="event-form" options={{ presentation: "modal" }} />
      <Stack.Screen name="team" />
    </Stack>
  );
}

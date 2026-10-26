import { Stack } from "expo-router";

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        // Same swipe-back contract as the rest of the app — the sign-up flow is
        // a stack like any other, and stepping back should not require aiming
        // at the little chevron.
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    />
  );
}

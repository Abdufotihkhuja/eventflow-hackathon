import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { useRouter } from "expo-router";

import { PERM, useHasPermission } from "@shared/auth";
import { createSwipeTabs } from "@shared/nav/swipe-tabs";
import { OrgTabBar } from "@shared/ui";

const SwipeTabs = createSwipeTabs();

/**
 * Organizer tab shell: Главная / События / Работа / Организация in a floating capsule,
 * with Check-in as a detached round button beside it (it pushes the scanner,
 * so it is not a tab). Same navigator as the attendee side, so the two bars
 * behave identically — swipe pages between tabs and the lozenge follows.
 */
export default function OrgTabsLayout(): React.JSX.Element {
  const router = useRouter();
  const canCheckIn = useHasPermission()(PERM.attendanceCheckin);

  return (
    <SwipeTabs
      tabBarPosition="bottom"
      tabBar={(props: MaterialTopTabBarProps) => (
        <OrgTabBar {...props} onScan={canCheckIn ? () => router.push("/org/scan") : undefined} />
      )}
      // Tapping a tab switches instantly; animating would page through every
      // screen in between. Swiping is gesture-driven and unaffected.
      screenOptions={{ swipeEnabled: true, animationEnabled: false, lazy: true }}
    >
      <SwipeTabs.Screen name="index" />
      <SwipeTabs.Screen name="events" />
      <SwipeTabs.Screen name="work" />
      <SwipeTabs.Screen name="profile" />
    </SwipeTabs>
  );
}

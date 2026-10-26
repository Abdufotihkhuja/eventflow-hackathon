/**
 * A material top-tab navigator rendered at the BOTTOM of the screen.
 *
 * Why not bottom-tabs: react-navigation only pages the top-tab navigator, so a
 * bottom-tabs bar cannot be swiped and its indicator cannot follow a finger.
 * `withLayoutContext` keeps expo-router's file-based routing on top of it, so
 * `app/**\/(tabs)/*.tsx` still map 1:1 to routes.
 *
 * Call this once per layout module — each tab group needs its own navigator.
 *
 * NOTE for tab-bar authors: the `position` handed to the tab bar is a **React
 * Native Animated** value driven by the pager, not a Reanimated shared value.
 * Build those bars with RN Animated and animate only opacity/transform so they
 * stay on the native driver.
 */
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";

export function createSwipeTabs() {
  const { Navigator } = createMaterialTopTabNavigator();
  return withLayoutContext(Navigator);
}

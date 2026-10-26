/**
 * `useScreenFocused` — is the enclosing navigation screen focused?
 *
 * Like `useIsFocused` from react-navigation, but safe OUTSIDE a navigation
 * context (returns `true` — e.g. root-level providers, modals, tests), so
 * shared components can pause their animation loops on blurred screens
 * without caring where they're mounted (GAP_PLAN §3.4 loop rule).
 */
import { useContext, useEffect, useState } from "react";
import { NavigationContext } from "@react-navigation/native";

export function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => (navigation ? navigation.isFocused() : true));

  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener("focus", () => setFocused(true));
    const offBlur = navigation.addListener("blur", () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return navigation ? focused : true;
}

/**
 * Active-palette context. A `<Screen dark>` (or any `PaletteProvider`) sets the
 * palette for its subtree so UI primitives recolor without prop-drilling a
 * `dark` flag through every component. Defaults to the light (bone) palette.
 */
import { createContext, useContext, type PropsWithChildren } from "react";

import { light, dark, type Palette } from "./colors";

const PaletteCtx = createContext<Palette>(light);

export function PaletteProvider({
  dark: isDark,
  children,
}: PropsWithChildren<{ dark?: boolean }>): React.JSX.Element {
  return <PaletteCtx.Provider value={isDark ? dark : light}>{children}</PaletteCtx.Provider>;
}

/** The active palette (light or dark) for the current subtree. */
export const usePalette = (): Palette => useContext(PaletteCtx);

/** Whether the current subtree is on the dark palette. */
export const useDark = (): boolean => useContext(PaletteCtx).isDark;

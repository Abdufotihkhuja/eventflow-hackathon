/**
 * Wordmark — the original EventFlow logo (dotted-swirl mark + "eventflow"
 * lockup), rendered from the same SVG web-public ships. The orange lockup
 * holds on both light and dark surfaces, so there is no dark variant.
 */
import { SvgXml } from "react-native-svg";

import { LOGO_XML, MARK_XML } from "./logo-data";

/** Lockup aspect ratio — viewBox 565×126. */
const LOGO_RATIO = 565 / 126;

export function Mark({ size = 24 }: { size?: number }): React.JSX.Element {
  return <SvgXml xml={MARK_XML} width={size} height={size} />;
}

export function Wordmark({ size = 24 }: { size?: number }): React.JSX.Element {
  return <SvgXml xml={LOGO_XML} width={Math.round(size * LOGO_RATIO)} height={size} />;
}

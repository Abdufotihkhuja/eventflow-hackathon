/**
 * Brand marks for social sign-in (Google, LinkedIn). Kept separate from the
 * monochrome lucide Icon set because these must render in their official brand
 * colors. SVG via react-native-svg (already a dependency).
 */
import Svg, { Path, Rect } from "react-native-svg";

export function GoogleMark({ size = 18 }: { size?: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

export function LinkedInMark({ size = 18 }: { size?: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={4} fill="#0A66C2" />
      <Path
        fill="#fff"
        d="M8.34 18.34V9.9H5.55v8.44h2.79zM6.94 8.74c.97 0 1.58-.65 1.58-1.46-.02-.83-.61-1.46-1.56-1.46S5.4 6.45 5.4 7.28c0 .81.6 1.46 1.52 1.46h.02zM9.89 18.34h2.79v-4.71c0-.25.02-.5.09-.68.2-.5.66-1.02 1.42-1.02.99 0 1.39.76 1.39 1.87v4.54h2.79v-4.86c0-2.58-1.38-3.78-3.21-3.78-1.5 0-2.16.83-2.53 1.4h.02V9.9H9.89c.04.79 0 8.44 0 8.44z"
      />
    </Svg>
  );
}

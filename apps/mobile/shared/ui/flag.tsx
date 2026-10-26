/**
 * Flag — compact SVG country flags for the language switcher (uz / ru / en→GB).
 *
 * Rendered as SVG, NOT emoji: country-flag emoji don't render on most Android
 * devices (they fall back to the 2-letter code), and the UZ market is
 * Android-heavy. SVG is crisp and identical on iOS / Android / web.
 */
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

type Code = "uz" | "ru" | "en";

function Russia(): React.JSX.Element {
  return (
    <>
      <Rect x={0} y={0} width={60} height={13.34} fill="#FFFFFF" />
      <Rect x={0} y={13.33} width={60} height={13.34} fill="#0039A6" />
      <Rect x={0} y={26.66} width={60} height={13.34} fill="#D52B1E" />
    </>
  );
}

function Uzbekistan(): React.JSX.Element {
  return (
    <>
      {/* bands: sky-blue / white / green with red fimbriations */}
      <Rect x={0} y={0} width={60} height={40} fill="#1EB53A" />
      <Rect x={0} y={0} width={60} height={26.7} fill="#FFFFFF" />
      <Rect x={0} y={0} width={60} height={13} fill="#0099B5" />
      <Rect x={0} y={12.4} width={60} height={1.2} fill="#CE1126" />
      <Rect x={0} y={26.4} width={60} height={1.2} fill="#CE1126" />
      {/* crescent */}
      <Circle cx={9} cy={6.5} r={4} fill="#FFFFFF" />
      <Circle cx={11} cy={6.5} r={4} fill="#0099B5" />
      {/* a few stars */}
      <Circle cx={16} cy={4} r={0.7} fill="#FFFFFF" />
      <Circle cx={19.5} cy={4} r={0.7} fill="#FFFFFF" />
      <Circle cx={16} cy={7.5} r={0.7} fill="#FFFFFF" />
      <Circle cx={19.5} cy={7.5} r={0.7} fill="#FFFFFF" />
      <Circle cx={23} cy={7.5} r={0.7} fill="#FFFFFF" />
    </>
  );
}

function UnionJack(): React.JSX.Element {
  return (
    <>
      <Rect x={0} y={0} width={60} height={40} fill="#012169" />
      <Path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth={8} />
      <Path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth={3} />
      <Rect x={24} y={0} width={12} height={40} fill="#FFFFFF" />
      <Rect x={0} y={14} width={60} height={12} fill="#FFFFFF" />
      <Rect x={26.5} y={0} width={7} height={40} fill="#C8102E" />
      <Rect x={0} y={16.5} width={60} height={7} fill="#C8102E" />
    </>
  );
}

const FLAGS: Record<Code, () => React.JSX.Element> = {
  ru: Russia,
  uz: Uzbekistan,
  en: UnionJack,
};

export function Flag({ code, width = 28 }: { code: Code; width?: number }): React.JSX.Element {
  const height = Math.round((width * 40) / 60);
  const Body = FLAGS[code];
  // Rounded corners + hairline edge live INSIDE the SVG: a wrapping View with
  // `overflow: "hidden"` + borderRadius does not clip SVG content on Android,
  // so the flag's square corners poked out past the rounded border.
  const clipId = `flag-clip-${code}`;
  const rx = 4 * (60 / width); // 4pt on screen, in viewBox units
  return (
    <Svg width={width} height={height} viewBox="0 0 60 40">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={0} y={0} width={60} height={40} rx={rx} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Body />
      </G>
      <Rect
        x={0.5} y={0.5} width={59} height={39} rx={rx}
        fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1}
      />
    </Svg>
  );
}

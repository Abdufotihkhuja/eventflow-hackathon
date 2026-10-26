"use client";

import { useCallback, useState, type CSSProperties } from "react";

import { useLocale } from "@eventflow/i18n/react";

import type { DesignEvent, DesignEventPattern } from "./types";

/**
 * Bounds for the hero frame's aspect-ratio when `fit="contain"` adapts to the
 * source image. Inside this window we mirror the image's intrinsic ratio so
 * nothing is letterboxed; outside we clamp and a blurred copy of the image
 * fills the residual gap. 4:5 keeps tall portraits readable on phones; 21:9
 * keeps cinematic banners from collapsing into a thin strip.
 */
const MIN_HERO_ASPECT = 4 / 5;
const MAX_HERO_ASPECT = 21 / 9;
/** While the natural ratio is still loading we use this so layout doesn't jump. */
const FALLBACK_HERO_ASPECT = 16 / 10;

const C = (h: number, s: number, l: number): string => `hsl(${h} ${s}% ${l}%)`;

const ABSOLUTE_FILL: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

interface PatternProps {
  hue: number;
}

const Sunburst = ({ hue }: PatternProps): React.ReactNode => {
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI;
    const x1 = 50 + Math.cos(a) * 4;
    const y1 = 100 - Math.sin(a) * 4;
    const x2 = 50 + Math.cos(a) * 80;
    const y2 = 100 - Math.sin(a) * 80;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={C(hue, 70, 60)}
        strokeWidth="0.6"
        opacity="0.55"
      />
    );
  });
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMax slice"
      style={ABSOLUTE_FILL}
    >
      <defs>
        <linearGradient id={`sb-${hue}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C(hue, 80, 24)} />
          <stop offset="60%" stopColor={C(hue, 78, 38)} />
          <stop offset="100%" stopColor={C(hue, 88, 52)} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#sb-${hue})`} />
      <g>{rays}</g>
      <circle cx="50" cy="100" r="22" fill={C(hue, 92, 60)} opacity="0.95" />
      <circle
        cx="50"
        cy="100"
        r="38"
        fill="none"
        stroke={C(hue, 92, 70)}
        strokeWidth="0.4"
        opacity="0.5"
      />
    </svg>
  );
};

const Grid = ({ hue }: PatternProps): React.ReactNode => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid slice"
    style={ABSOLUTE_FILL}
  >
    <rect width="100" height="100" fill={C(hue, 28, 14)} />
    <g stroke={C(hue, 50, 60)} strokeWidth="0.3" opacity="0.45">
      {Array.from({ length: 11 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" />
      ))}
    </g>
    <rect x="14" y="22" width="36" height="36" fill={C(hue, 70, 50)} opacity="0.9" />
    <rect x="50" y="42" width="32" height="36" fill="#0e0e0d" opacity="0.85" />
    <circle cx="72" cy="22" r="8" fill={C(hue, 90, 70)} />
  </svg>
);

const Arches = ({ hue }: PatternProps): React.ReactNode => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid slice"
    style={ABSOLUTE_FILL}
  >
    <defs>
      <linearGradient id={`ar-${hue}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C(hue, 78, 58)} />
        <stop offset="100%" stopColor={C(hue, 78, 32)} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill={C(hue, 50, 18)} />
    <path
      d="M 18 100 L 18 56 A 14 14 0 0 1 46 56 L 46 100 Z"
      fill={`url(#ar-${hue})`}
    />
    <path
      d="M 56 100 L 56 42 A 14 14 0 0 1 84 42 L 84 100 Z"
      fill={C(hue, 60, 70)}
      opacity="0.92"
    />
    <line
      x1="0"
      y1="100"
      x2="100"
      y2="100"
      stroke={C(hue, 90, 80)}
      strokeWidth="1.5"
    />
    <circle cx="32" cy="22" r="6" fill={C(hue, 92, 78)} />
  </svg>
);

const Dots = ({ hue }: PatternProps): React.ReactNode => {
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 12; c++) {
      const x = 6 + c * 8;
      const y = 14 + r * 10;
      const size = Math.max(0.6, 3.4 - Math.hypot(x - 50, y - 50) / 16);
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={x}
          cy={y}
          r={size}
          fill={C(hue, 80, 65)}
          opacity={0.85}
        />,
      );
    }
  }
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={ABSOLUTE_FILL}
    >
      <rect width="100" height="100" fill={C(hue, 30, 12)} />
      <g>{dots}</g>
    </svg>
  );
};

const Rays = ({ hue }: PatternProps): React.ReactNode => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid slice"
    style={ABSOLUTE_FILL}
  >
    <defs>
      <linearGradient id={`ry-${hue}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={C(hue, 60, 22)} />
        <stop offset="100%" stopColor={C(hue, 60, 8)} />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill={`url(#ry-${hue})`} />
    {Array.from({ length: 8 }, (_, i) => (
      <polygon
        key={i}
        points={`0,${i * 14} 100,${i * 14 + 6} 100,${i * 14 + 8} 0,${i * 14 + 2}`}
        fill={C(hue, 80, 60)}
        opacity={0.18 + (i % 2) * 0.1}
      />
    ))}
    <circle cx="78" cy="28" r="14" fill={C(hue, 90, 70)} opacity="0.9" />
  </svg>
);

const PATTERN_MAP: Record<DesignEventPattern, React.FC<PatternProps>> = {
  sunburst: Sunburst,
  grid: Grid,
  arches: Arches,
  dots: Dots,
  rays: Rays,
};

interface PosterArtProps {
  hue: number;
  pattern: DesignEventPattern;
}

export const PosterArt = ({
  hue,
  pattern,
}: PosterArtProps): React.ReactNode => {
  const Pattern = PATTERN_MAP[pattern] ?? Sunburst;
  return <Pattern hue={hue} />;
};

interface EventPosterProps {
  event: DesignEvent;
  pickLabel?: string;
  /**
   * How the cover image fits the poster frame. "cover" crops to fill
   * (good for cards, where uniform dimensions matter); "contain" preserves
   * the image's aspect ratio and pads with a blurred copy of the same
   * image so nothing is cropped (good for hero blocks).
   */
  fit?: "cover" | "contain";
  /**
   * Hint the browser to fetch the cover with high priority. Set on the single
   * above-the-fold hero poster (improves LCP); leave off for card grids so
   * off-screen covers don't compete for bandwidth.
   */
  priority?: boolean;
}

export const EventPoster = ({
  event,
  pickLabel,
  fit = "cover",
  priority = false,
}: EventPosterProps): React.ReactNode => {
  const locale = useLocale();
  // `pick` mirrors `event.isFeatured`, which is toggled only by a super-admin
  // (real platform curation), so a "Featured" badge here is honest.
  const featuredLabel =
    pickLabel ??
    (locale === "ru" ? "Рекомендуем" : locale === "uz" ? "Tavsiya" : "Featured");
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);

  const handleImageLoad = (
    e: React.SyntheticEvent<HTMLImageElement>,
  ): void => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalAspect(img.naturalWidth / img.naturalHeight);
    }
  };

  // If the browser already had the cover cached, `onLoad` may fire before
  // React attaches the listener. The `complete` flag + non-zero naturalWidth
  // tell us the image is ready, so we read dimensions on the very first
  // mount of the foreground <img>.
  const handleImgRef = useCallback((img: HTMLImageElement | null): void => {
    if (!img) return;
    if (
      img.complete &&
      img.naturalWidth > 0 &&
      img.naturalHeight > 0
    ) {
      setNaturalAspect((prev) =>
        prev != null ? prev : img.naturalWidth / img.naturalHeight,
      );
    }
  }, []);

  // When the frame should fit the image, drive its aspect-ratio from the
  // image's intrinsic ratio (clamped) so the cover renders without bars on
  // phones, tablets, and desktop alike. Outside the clamp window we fall
  // back to letterboxing on top of the blurred backdrop.
  const containerAspect =
    fit === "contain"
      ? naturalAspect != null
        ? Math.max(MIN_HERO_ASPECT, Math.min(MAX_HERO_ASPECT, naturalAspect))
        : FALLBACK_HERO_ASPECT
      : undefined;

  const containerStyle: CSSProperties =
    fit === "contain"
      ? {
          position: "relative",
          width: "100%",
          aspectRatio: String(containerAspect),
          overflow: "hidden",
          borderRadius: "inherit",
          isolation: "isolate",
          background: "var(--ink-400)",
        }
      : {
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: "inherit",
          isolation: "isolate",
        };

  return (
  <div style={containerStyle}>
    {event.cover ? (
      fit === "contain" ? (
        <>
          <img
            src={event.cover}
            alt=""
            aria-hidden="true"
            style={{
              ...ABSOLUTE_FILL,
              objectFit: "cover",
              filter: "blur(28px) saturate(1.1)",
              transform: "scale(1.15)",
              opacity: 0.85,
            }}
          />
          <img
            src={event.cover}
            alt={event.title}
            ref={handleImgRef}
            onLoad={handleImageLoad}
            fetchPriority={priority ? "high" : undefined}
            style={{
              ...ABSOLUTE_FILL,
              objectFit: "contain",
            }}
          />
        </>
      ) : (
        <img
          src={event.cover}
          alt={event.title}
          fetchPriority={priority ? "high" : undefined}
          style={{
            ...ABSOLUTE_FILL,
            objectFit: "cover",
          }}
        />
      )
    ) : (
      <PosterArt hue={event.hue} pattern={event.pattern} />
    )}
    {event.pick ? (
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          font: "600 10px/1 'Manrope'",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--bone-100)",
          background: "rgba(14,14,13,0.7)",
          backdropFilter: "blur(8px)",
          padding: "6px 9px",
          borderRadius: 4,
        }}
      >
        {featuredLabel}
      </div>
    ) : null}
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        font: "500 10px/1 'JetBrains Mono'",
        letterSpacing: 0,
        color: "var(--bone-100)",
        background: "rgba(14,14,13,0.7)",
        backdropFilter: "blur(8px)",
        padding: "6px 9px",
        borderRadius: 4,
      }}
    >
      {event.date.replace(/^[\p{L}.]+,\s/u, "")}
    </div>
  </div>
  );
};

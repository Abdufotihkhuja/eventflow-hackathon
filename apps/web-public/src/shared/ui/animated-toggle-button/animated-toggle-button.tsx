"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { forwardRef, useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { useFinePointer } from "@shared/lib/hooks/useFinePointer";
import { useHaptic } from "@shared/lib/hooks/useHaptic";
import { useReducedMotion } from "@shared/lib/hooks/useReducedMotion";
import {
  crossfade,
  popSpring,
  pressSpring,
} from "@shared/lib/motion/spring-presets";
import { cn } from "@shared/lib/utils";

import { Spinner } from "../spinner";

import { ParticleBurst } from "./particle-burst";

export type ToggleFlavor = "like" | "save" | "follow" | "neutral";
export type ToggleVariant = "icon" | "compact" | "pill";
export type ToggleSize = "sm" | "md" | "lg";

export interface AnimatedToggleButtonProps {
  isActive: boolean;
  isLoading?: boolean;
  onToggle: (nextActive: boolean) => void;
  variant?: ToggleVariant;
  size?: ToggleSize;
  flavor?: ToggleFlavor;
  idleIcon: ReactNode;
  activeIcon: ReactNode;
  idleLabel?: string;
  activeLabel?: string;
  /** Show a numeric count beside the label/icon (likes, followers...). */
  count?: number;
  /** Particle burst on activation. Defaults to true for `like`, false otherwise. */
  burst?: boolean;
  /** Trigger a haptic tap on activation. Defaults to true on coarse pointers. */
  haptic?: boolean;
  ariaLabelIdle: string;
  ariaLabelActive: string;
  className?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

const ICON_SIZE_PX: Record<ToggleSize, number> = {
  sm: 16,
  md: 20,
  lg: 22,
};

const FLAVOR_TOKENS: Record<
  ToggleFlavor,
  {
    burstColor: string;
    ringColor: string;
    activeText: string;
    idleText: string;
    compactIdleHover: string;
    pillIdle: string;
    pillActive: string;
    iconBgIdle: string;
    iconBgActive: string;
    activeGlow: string;
  }
> = {
  like: {
    burstColor: "bg-[var(--danger)]",
    ringColor: "bg-[var(--danger)]/30",
    activeText: "text-[var(--danger)]",
    idleText: "text-ink-300",
    compactIdleHover: "hover:text-[var(--danger)]",
    pillIdle:
      "border-bone-300 bg-white text-ink-200 hover:border-[var(--danger-soft)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]",
    pillActive:
      "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]",
    iconBgIdle:
      "bg-white/90 text-ink-200 shadow-md hover:text-[var(--danger)]",
    iconBgActive:
      "bg-white text-[var(--danger)] shadow-md ring-1 ring-[var(--danger)]/15",
    activeGlow: "shadow-[0_0_0_6px_rgba(194,39,14,0.08)]",
  },
  save: {
    burstColor: "bg-ember-500",
    ringColor: "bg-ember-400/30",
    activeText: "text-ember-500",
    idleText: "text-ink-300",
    compactIdleHover: "hover:text-ember-500",
    pillIdle:
      "border-bone-300 bg-white text-ink-200 hover:border-ember-100 hover:bg-ember-50 hover:text-ember-500",
    pillActive:
      "border-ember-100 bg-ember-50 text-ember-500",
    iconBgIdle: "bg-white/90 text-ink-200 shadow-md hover:text-ember-500",
    iconBgActive: "bg-white text-ember-500 shadow-md ring-1 ring-ember-400/20",
    activeGlow: "shadow-[0_0_0_6px_rgba(234,88,12,0.10)]",
  },
  follow: {
    burstColor: "bg-ember-500",
    ringColor: "bg-ember-400/30",
    activeText: "text-ember-600",
    idleText: "text-ink-400",
    compactIdleHover: "hover:text-ember-500",
    pillIdle:
      "border-[var(--border-2)] bg-white text-ink-400 hover:bg-bone-100 hover:border-[var(--border-strong)]",
    pillActive:
      "border-ember-100 bg-ember-50 text-ember-600 hover:bg-ember-100",
    iconBgIdle: "bg-white/90 text-ink-300 shadow-md hover:text-ember-500",
    iconBgActive: "bg-white text-ember-500 shadow-md ring-1 ring-ember-400/20",
    activeGlow: "shadow-[0_0_0_6px_rgba(234,88,12,0.10)]",
  },
  neutral: {
    burstColor: "bg-ink-300",
    ringColor: "bg-ink-300/30",
    activeText: "text-ink-400",
    idleText: "text-ink-200",
    compactIdleHover: "hover:text-ink-400",
    pillIdle:
      "border-bone-300 bg-white text-ink-200 hover:border-ink-200 hover:bg-bone-100",
    pillActive: "border-ink-200 bg-bone-200 text-ink-400",
    iconBgIdle: "bg-white/90 text-ink-200 shadow-md hover:text-ink-400",
    iconBgActive: "bg-white text-ink-400 shadow-md",
    activeGlow: "",
  },
};

const ICON_VARIANT_SIZE: Record<ToggleSize, string> = {
  sm: "size-9",
  md: "size-10",
  lg: "size-11",
};

const PILL_SIZE: Record<ToggleSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

const COMPACT_SIZE: Record<ToggleSize, string> = {
  sm: "text-[13px] gap-1.5",
  md: "text-sm gap-1.5",
  lg: "text-base gap-2",
};

function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 10_000) return `${(value / 1000).toFixed(1)}k`;
  if (value < 1_000_000) return `${Math.round(value / 1000)}k`;
  return `${(value / 1_000_000).toFixed(1)}m`;
}

/**
 * RingPulse — single shockwave that radiates from the icon centre when the
 * toggle activates. Mounted with a key so each activation re-mounts and
 * restarts the keyframe.
 */
function RingPulse({
  token,
  colorClass,
}: {
  token: number;
  colorClass: string;
}) {
  if (!token) return null;
  return (
    <motion.span
      key={token}
      aria-hidden="true"
      initial={{ scale: 0.4, opacity: 0.55 }}
      animate={{ scale: 2.4, opacity: 0 }}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-full",
        colorClass
      )}
    />
  );
}

export const AnimatedToggleButton = forwardRef<
  HTMLButtonElement,
  AnimatedToggleButtonProps
  // eslint-disable-next-line prefer-arrow-callback -- named function preserves displayName for devtools
>(function AnimatedToggleButton(
  {
    isActive,
    isLoading = false,
    onToggle,
    variant = "icon",
    size = "md",
    flavor = "neutral",
    idleIcon,
    activeIcon,
    idleLabel,
    activeLabel,
    count,
    burst,
    haptic = true,
    ariaLabelIdle,
    ariaLabelActive,
    className,
    disabled,
    onClick,
  },
  ref
) {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const triggerHaptic = useHaptic();
  const [burstToken, setBurstToken] = useState(0);
  const [ringToken, setRingToken] = useState(0);
  const [glowToken, setGlowToken] = useState(0);
  const lastActiveRef = useRef(isActive);

  const wantsBurst = burst ?? flavor === "like";
  const tokens = FLAVOR_TOKENS[flavor];
  const iconPx = ICON_SIZE_PX[size];

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    onClick?.(event);
    if (event.defaultPrevented) return;

    const next = !isActive;
    if (next && !reducedMotion) {
      const now = Date.now();
      setRingToken(now);
      setGlowToken(now);
      if (wantsBurst) setBurstToken(now);
    }
    if (next && haptic) {
      triggerHaptic("tap");
    }
    lastActiveRef.current = next;
    onToggle(next);
  };

  const ariaLabel = isActive ? ariaLabelActive : ariaLabelIdle;
  const label = isActive ? activeLabel : idleLabel;

  // Press feels noticeable on every variant. Hover lifts the icon variant
  // slightly so the affordance reads as interactive even at rest.
  const motionProps = reducedMotion
    ? {}
    : {
        whileTap: { scale: variant === "icon" ? 0.88 : 0.95 },
        // hover-лифт только для точных указателей: на таче tap «залипает» в hover
        whileHover: !finePointer
          ? undefined
          : variant === "icon"
            ? { scale: 1.06 }
            : variant === "pill"
              ? { y: -1 }
              : undefined,
        transition: pressSpring,
      };

  const iconStyle: CSSProperties = { width: iconPx, height: iconPx };

  const renderIconSwap = () => (
    <span
      className="relative inline-flex items-center justify-center"
      style={iconStyle}
    >
      {/* shockwave только там, где и burst (like): один-два слоя на активацию */}
      {wantsBurst && !reducedMotion ? (
        <RingPulse token={ringToken} colorClass={tokens.ringColor} />
      ) : null}

      {/* Без mode="wait": оба span absolute, кроссфейд идёт внахлёст и
          не блокируется при быстром повторном клике. */}
      <AnimatePresence initial={false}>
        {isLoading ? (
          <motion.span
            key="spinner"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={crossfade}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Spinner
              size={size === "sm" ? "xs" : size === "lg" ? "md" : "sm"}
              tone="current"
            />
          </motion.span>
        ) : (
          <motion.span
            key={isActive ? "active" : "idle"}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 0.85,
                    rotate: isActive ? -8 : 8,
                  }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : isActive
                  ? {
                      opacity: 1,
                      // лёгкий овершут на активацию — «поп» без прыжка из ниоткуда
                      scale: [0.85, 1.12, 1],
                      rotate: [-8, 3, 0],
                    }
                  : { opacity: 1, scale: 1, rotate: 0 }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 0.9,
                    rotate: isActive ? 6 : -6,
                  }
            }
            transition={
              reducedMotion
                ? crossfade
                : isActive
                  ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
                  : popSpring
            }
            className="absolute inset-0 flex items-center justify-center will-change-transform"
          >
            {isActive ? activeIcon : idleIcon}
          </motion.span>
        )}
      </AnimatePresence>

      {wantsBurst && !reducedMotion ? (
        <ParticleBurst
          token={burstToken}
          colorClass={tokens.burstColor}
          distance={iconPx + 8}
        />
      ) : null}
    </span>
  );

  const renderCount = () => {
    if (typeof count !== "number") return null;
    return (
      <span className="relative inline-flex min-w-[1ch] items-center overflow-hidden tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={count}
            initial={
              reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }
            }
            transition={crossfade}
            className="inline-block"
          >
            {formatCount(count)}
          </motion.span>
        </AnimatePresence>
      </span>
    );
  };

  const baseButton =
    "relative inline-flex items-center justify-center select-none cursor-pointer transition-[background-color,border-color,color,box-shadow] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100 disabled:cursor-not-allowed";

  // Brief glow that fires on activation — adds satisfaction without
  // sticking around (so it doesn't compete with the active resting state).
  const glowOverlay =
    glowToken && !reducedMotion ? (
      <motion.span
        key={`glow-${glowToken}`}
        aria-hidden="true"
        initial={{ opacity: 0.85, scale: 0.9 }}
        animate={{ opacity: 0, scale: 1.15 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit]",
          tokens.activeGlow
        )}
      />
    ) : null;

  if (variant === "icon") {
    return (
      <motion.button
        ref={ref}
        type="button"
        {...motionProps}
        onClick={handleClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={isActive}
        aria-busy={isLoading || undefined}
        className={cn(
          baseButton,
          "rounded-full backdrop-blur-sm",
          ICON_VARIANT_SIZE[size],
          isActive ? tokens.iconBgActive : tokens.iconBgIdle,
          isLoading && "cursor-wait",
          className
        )}
      >
        {glowOverlay}
        {renderIconSwap()}
      </motion.button>
    );
  }

  if (variant === "compact") {
    return (
      <motion.button
        ref={ref}
        type="button"
        {...motionProps}
        onClick={handleClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={isActive}
        aria-busy={isLoading || undefined}
        className={cn(
          baseButton,
          "bg-transparent font-medium",
          COMPACT_SIZE[size],
          isActive ? tokens.activeText : tokens.idleText,
          !isActive && tokens.compactIdleHover,
          isLoading && "cursor-wait opacity-90",
          className
        )}
      >
        {renderIconSwap()}
        {renderCount()}
      </motion.button>
    );
  }

  // pill
  return (
    <motion.button
      ref={ref}
      type="button"
      layout
      {...motionProps}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      aria-busy={isLoading || undefined}
      className={cn(
        baseButton,
        "rounded-full border font-semibold whitespace-nowrap",
        PILL_SIZE[size],
        isActive ? tokens.pillActive : tokens.pillIdle,
        isLoading && "cursor-wait opacity-90",
        className
      )}
    >
      {glowOverlay}
      {renderIconSwap()}
      {label ? (
        <span className="relative inline-flex overflow-hidden leading-none">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }
              }
              transition={crossfade}
              className="inline-block"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}
      {renderCount()}
    </motion.button>
  );
});

"use client";

import { motion } from "framer-motion";

import { cn } from "@shared/lib/utils";

interface ParticleBurstProps {
  /**
   * Stable token that triggers a fresh burst when it changes (e.g. timestamp
   * of the last activation). Pass `0` / falsy to render nothing.
   */
  token: number;
  /** Number of particles in the burst. */
  count?: number;
  /** Final radius (px) the particles travel to. */
  distance?: number;
  /** Tailwind colour class for the particle dot. */
  colorClass?: string;
  className?: string;
}

/**
 * Radial particle burst — emitted on activation only. The component is keyed
 * by `token`, so a re-mount restarts the animation cleanly.
 */
export function ParticleBurst({
  token,
  count = 10,
  distance = 32,
  colorClass = "bg-current",
  className,
}: ParticleBurstProps) {
  if (!token) return null;

  return (
    <span
      key={token}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const jitter = 0.85 + ((i * 37) % 30) / 100; // 0.85 – 1.15
        const x = Math.cos(angle) * distance * jitter;
        const y = Math.sin(angle) * distance * jitter;
        const delay = (i % 5) * 0.012;
        const isLarge = i % 2 === 0;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{
              x,
              y,
              opacity: 0,
              scale: isLarge ? 1.1 : 0.7,
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
              delay,
            }}
            className={cn(
              "absolute rounded-full",
              isLarge ? "size-1.5" : "size-1",
              colorClass
            )}
          />
        );
      })}
    </span>
  );
}

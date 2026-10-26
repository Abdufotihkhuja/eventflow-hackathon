"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseActiveSectionOptions {
  /**
   * Vertical offset (px) from the viewport top that defines the "trigger line".
   * Should equal the height of the sticky chrome above the content
   * (page header + sticky in-page nav + small buffer).
   */
  offset?: number;
  /**
   * Time (ms) the scroll-based updater stays suspended after an external
   * setActive call. Covers the duration of `scrollIntoView({behavior:"smooth"})`
   * so the active pill doesn't flash through every intermediate section.
   */
  manualLockMs?: number;
}

/**
 * Returns the section id that the user is currently reading, given a list of
 * section ids in document order.
 *
 * Uses a scroll-position trigger line rather than IntersectionObserver: walking
 * the sections top-down and picking the last one whose top has crossed the
 * trigger guarantees the result matches reading order and never flickers
 * between non-adjacent sections during fast scrolling.
 *
 * Calling the returned setter (e.g. from a nav-click handler) sets the active
 * id immediately AND suspends scroll-based updates for `manualLockMs` so that
 * a smooth-scroll animation does not visually walk the highlight through
 * every intermediate section before reaching the target.
 */
export function useActiveSection(
  sectionIds: string[],
  fallback: string,
  options: UseActiveSectionOptions = {},
): [string, (id: string) => void] {
  const [active, setActiveState] = useState<string>(fallback);
  const lockUntilRef = useRef<number>(0);

  const offset = options.offset ?? 140;
  const manualLockMs = options.manualLockMs ?? 800;

  const setActive = useCallback(
    (id: string) => {
      lockUntilRef.current = Date.now() + manualLockMs;
      setActiveState(id);
    },
    [manualLockMs],
  );

  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    let frame = 0;

    const compute = (): void => {
      frame = 0;
      if (Date.now() < lockUntilRef.current) return;
      let nextId = sectionIds[0] ?? fallback;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) {
          nextId = id;
        } else {
          break;
        }
      }
      setActiveState((prev) => (prev === nextId ? prev : nextId));
    };

    const onScroll = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [sectionIds, fallback, offset]);

  return [active, setActive];
}

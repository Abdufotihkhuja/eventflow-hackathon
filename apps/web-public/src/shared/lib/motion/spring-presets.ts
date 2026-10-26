import type { Transition } from "framer-motion";

export const pressSpring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 22,
  mass: 0.6,
};

export const popSpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 14,
  mass: 0.55,
};

export const softSpring: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 26,
  mass: 0.8,
};

export const crossfade: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};

export const microFade: Transition = {
  duration: 0.12,
  ease: [0.22, 1, 0.36, 1],
};

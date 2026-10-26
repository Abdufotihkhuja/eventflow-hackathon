"use client";

import { MotionFadeIn } from "@shared/ui";

interface VerifyEmailContainerProps {
  children: React.ReactNode;
}

export function VerifyEmailContainer({
  children,
}: VerifyEmailContainerProps): React.JSX.Element {
  return (
    <MotionFadeIn
      direction="none"
      className="border border-[var(--border-1)] bg-white shadow-sm relative w-full max-w-md rounded-xl p-8 shadow-[0_24px_64px_rgba(15,23,42,0.15)] sm:p-10"
    >
      {children}
    </MotionFadeIn>
  );
}

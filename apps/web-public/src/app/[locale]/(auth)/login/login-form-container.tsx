"use client";

import { MotionFadeIn } from "@shared/ui";

interface LoginFormContainerProps {
  children: React.ReactNode;
}

export function LoginFormContainer({
  children,
}: LoginFormContainerProps): React.JSX.Element {
  return (
    <MotionFadeIn direction="up" className="w-full max-w-[420px]">
      {children}
    </MotionFadeIn>
  );
}

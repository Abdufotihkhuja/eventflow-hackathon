"use client";

import * as React from "react";

import { cn } from "@shared/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-[var(--border-2)] bg-white px-4 py-3",
      "text-base text-ink-400 placeholder:text-ink-50",
      "transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
      "hover:border-[var(--border-strong)]",
      "focus:border-ember-400 focus:outline-none focus:ring-[3px] focus:ring-ember-400/22",
      "disabled:cursor-not-allowed disabled:bg-bone-200 disabled:text-ink-50 disabled:opacity-100",
      "resize-y sm:text-sm",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };

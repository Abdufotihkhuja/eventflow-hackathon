"use client";

import type { ForwardedRef, InputHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@shared/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, hasError = false, type = "text", ...props },
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 w-full rounded-md px-3.5 text-base text-ink-400 sm:text-sm",
          "bg-white",
          "border border-[var(--border-2)]",
          "placeholder:text-ink-50 placeholder:font-normal",
          "transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
          "focus:outline-none focus:border-ember-400 focus:ring-[3px] focus:ring-ember-400/22",
          "hover:border-[var(--border-strong)]",
          "disabled:cursor-not-allowed disabled:bg-bone-200 disabled:text-ink-50 disabled:border-[var(--border-1)]",
          hasError && [
            "border-[var(--danger)] bg-[var(--danger-soft)]/40",
            "focus:border-[var(--danger)] focus:ring-[var(--danger)]/22",
          ],
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

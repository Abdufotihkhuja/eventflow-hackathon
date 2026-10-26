"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import { useReducedMotion } from "@shared/lib/hooks/useReducedMotion";
import { softSpring } from "@shared/lib/motion/spring-presets";
import { cn } from "@shared/lib/utils";

import { ActionButton } from "../action-button/action-button";
import { Button } from "../button/button";

export type ConfirmTone = "danger" | "warning" | "neutral";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmTone;
  /** Called when the user confirms. Supports async — button shows spinner until resolved. */
  onConfirm: () => void | Promise<void>;
  /** Called when the user cancels (optional, parent normally just closes via onOpenChange). */
  onCancel?: () => void;
  icon?: ReactNode;
  className?: string;
}

const TONE_TOKENS: Record<
  ConfirmTone,
  {
    iconBg: string;
    iconColor: string;
    confirmVariant: "danger" | "primary" | "ink";
  }
> = {
  danger: {
    iconBg: "bg-[var(--danger-soft)]",
    iconColor: "text-[var(--danger)]",
    confirmVariant: "danger",
  },
  warning: {
    iconBg: "bg-ember-50",
    iconColor: "text-ember-500",
    confirmVariant: "primary",
  },
  neutral: {
    iconBg: "bg-bone-200",
    iconColor: "text-ink-400",
    confirmVariant: "ink",
  },
};

/**
 * Polished confirm dialog for destructive / important actions.
 * Defaults focus to Cancel for safety (Apple HIG / WAI-ARIA APG guidance).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "neutral",
  onConfirm,
  onCancel,
  icon,
  className,
}: ConfirmDialogProps) {
  const reducedMotion = useReducedMotion();
  const tokens = TONE_TOKENS[tone];
  const [isConfirming, setIsConfirming] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isConfirming) return;
    try {
      setIsConfirming(true);
      await Promise.resolve(onConfirm());
      setDidSucceed(true);
      // small delay so the success flash on the button is perceptible
      window.setTimeout(() => {
        setDidSucceed(false);
        onOpenChange(false);
      }, 520);
    } catch {
      // parent is expected to surface a toast; don't crash the dialog.
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, onConfirm, onOpenChange]);

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const overlayMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
      };

  const cardMotion = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 12, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 8, scale: 0.96 },
        transition: softSpring,
      };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                {...overlayMotion}
                className="fixed inset-0 z-[1200] bg-ink-400/45 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              forceMount
              onOpenAutoFocus={(event) => {
                // Focus the cancel button by default for safety.
                event.preventDefault();
                const root = event.currentTarget as HTMLElement | null;
                const cancelEl = root?.querySelector<HTMLButtonElement>(
                  "[data-confirm-dialog-cancel]"
                );
                cancelEl?.focus();
              }}
            >
              <motion.div
                {...cardMotion}
                role="alertdialog"
                className={cn(
                  "fixed left-1/2 top-1/2 z-[1201] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
                  "rounded-2xl bg-white p-6 shadow-[0_32px_80px_-24px_rgba(14,14,13,0.35)]",
                  "border border-bone-200",
                  className
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full",
                      tokens.iconBg,
                      tokens.iconColor
                    )}
                    aria-hidden="true"
                  >
                    {icon ?? <AlertTriangle className="size-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <DialogPrimitive.Title className="text-base font-semibold text-ink-400 leading-snug">
                      {title}
                    </DialogPrimitive.Title>
                    {description ? (
                      <DialogPrimitive.Description className="mt-1.5 text-sm text-ink-200 leading-relaxed">
                        {description}
                      </DialogPrimitive.Description>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleCancel}
                    data-confirm-dialog-cancel
                    disabled={isConfirming}
                  >
                    {cancelLabel}
                  </Button>
                  <ActionButton
                    type="button"
                    variant={tokens.confirmVariant}
                    size="md"
                    onClick={() => {
                      void handleConfirm();
                    }}
                    isLoading={isConfirming}
                    isSuccess={didSucceed}
                  >
                    {confirmLabel}
                  </ActionButton>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

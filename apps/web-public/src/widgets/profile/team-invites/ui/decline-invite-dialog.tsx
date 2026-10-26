"use client";

import { useState } from "react";

import { useT } from "@eventflow/i18n/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";

import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";

/** Столько же, сколько принимает бэкенд (DECLINE_REASON_MAX). */
const REASON_MAX = 500;

interface DeclineInviteDialogProps {
  open: boolean;
  organizationName: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

/**
 * Отказ от приглашения. Комментарий необязателен — отказать молча тоже
 * нормально, но если человек напишет причину, организатор увидит её в списке
 * приглашений и не будет звать повторно вслепую.
 */
export function DeclineInviteDialog({
  open,
  organizationName,
  isPending,
  onOpenChange,
  onConfirm,
}: DeclineInviteDialogProps): React.ReactNode {
  const t = useT();
  // Состояние живёт ровно столько, сколько открыт диалог: родитель монтирует
  // его только на время показа, поэтому прошлый текст не всплывает при
  // следующем открытии — и это не требует эффекта на синхронизацию.
  const [reason, setReason] = useState("");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1200] bg-ink-400/45 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[1201] w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-bone-200 bg-white p-6 shadow-[0_32px_80px_-24px_rgba(14,14,13,0.35)]"
          aria-describedby="decline-invite-description"
        >
          <DialogPrimitive.Title className="text-base font-semibold leading-snug text-ink-400">
            {t("public.profile.teamInvites.declineTitle", {
              organization: organizationName,
            })}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="decline-invite-description"
            className="mt-1.5 text-sm text-ink-200"
          >
            {t("public.profile.teamInvites.declineDescription")}
          </DialogPrimitive.Description>

          <div className="mt-4">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={REASON_MAX}
              rows={3}
              placeholder={t("public.profile.teamInvites.declinePlaceholder")}
              disabled={isPending}
            />
            <p className="mt-1.5 text-right text-xs text-ink-100">
              {reason.length}/{REASON_MAX}
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("public.profile.teamInvites.declineCancel")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onConfirm(reason)}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("public.profile.teamInvites.declineConfirm")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

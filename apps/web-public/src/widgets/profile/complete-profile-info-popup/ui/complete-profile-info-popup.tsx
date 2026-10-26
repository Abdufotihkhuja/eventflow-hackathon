/**
 * @module widgets/profile/complete-profile-info-popup/ui/complete-profile-info-popup
 * @description Popup «Заполните доп. поля» при входе в профиль (user.needsProfileInfo === true)
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useT } from "@eventflow/i18n/react";
import { X } from "lucide-react";

import { CompleteProfileInfoForm } from "@features/profile/complete-profile-info";
import { useBodyScrollLock, useEscapeKey } from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";

import type { User } from "@shared/api";

export interface CompleteProfileInfoPopupProps {
  /** Текущий пользователь; popup показывается при user?.needsProfileInfo === true */
  user: User | null;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Popup «Заполните доп. поля» — показывается при входе в кабинет, пока не вызван complete-profile-info.
 * Кнопка «Позже» скрывает popup до следующего захода на страницу профиля.
 */
export function CompleteProfileInfoPopup({
  user,
}: CompleteProfileInfoPopupProps): React.ReactNode {
  const t = useT();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const show = Boolean(user?.needsProfileInfo) && !dismissed;

  useBodyScrollLock({ enabled: show });
  useEscapeKey({
    enabled: show,
    onEscape: () => setDismissed(true),
  });

  // eslint-disable-next-line no-restricted-syntax -- portal target
  useEffect(() => {
    setMounted(true);
  }, []);

  // eslint-disable-next-line no-restricted-syntax -- focus management for the dialog
  useEffect(() => {
    if (!show) return;
    const previouslyFocused =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    previouslyFocused?.blur();
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [show]);

  // eslint-disable-next-line no-restricted-syntax -- focus trap inside the dialog
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("data-focus-trap-skip"));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [show]);

  if (!show || !mounted) {
    return null;
  }

  const dialog = (
    <div
      className={cn(
        "fixed inset-0 z-[1200] flex items-end justify-center bg-ink-400/60 backdrop-blur-sm",
        "sm:items-center sm:p-4",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      )}
      style={{
        // Защита от iPhone notch / Dynamic Island: модалка не вылезает в
        // safe-area-inset-top/bottom. На sm+ перекрывается `sm:p-4` (там есть
        // системный отступ от краёв).
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setDismissed(true);
        }
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          // dvh — dynamic viewport, учитывает URL bar Safari iOS;
          // vh-fallback на случай старых браузеров.
          "relative w-full max-w-2xl overflow-y-auto bg-bone-50 shadow-2xl",
          "max-h-[92vh] sm:max-h-[92vh]",
          "rounded-t-2xl sm:rounded-2xl",
          "border border-ink-400/10",
          "motion-safe:animate-in motion-safe:slide-in-from-bottom-4 sm:motion-safe:slide-in-from-bottom-0 sm:motion-safe:zoom-in-95 motion-safe:duration-200"
        )}
        style={{
          maxHeight: "min(92dvh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)))",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-profile-info-title"
        aria-describedby="complete-profile-info-description"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-400/10 bg-bone-50 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2
              id="complete-profile-info-title"
              className="text-lg font-semibold text-ink-400 sm:text-xl"
            >
              {t("public.profile.complete.title")}
            </h2>
            <p
              id="complete-profile-info-description"
              className="mt-1 text-sm text-ink-100"
            >
              {t("public.profile.complete.description")}
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            variant="subtle"
            size="sm"
            onClick={() => setDismissed(true)}
            aria-label={t("public.profile.complete.close")}
            className="shrink-0"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <CompleteProfileInfoForm user={user} />
        </div>

        <p className="px-5 pb-4 text-center text-xs text-ink-50 sm:px-6">
          {t("public.profile.complete.laterHint")}
        </p>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

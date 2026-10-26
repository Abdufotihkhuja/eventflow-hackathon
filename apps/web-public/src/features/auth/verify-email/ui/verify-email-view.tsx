"use client";

/**
 * Информационный экран для актуального кодового flow верификации email
 */

import { Mail } from "lucide-react";

import { Button } from "@shared/ui/button";

interface VerifyEmailViewProps {
  email?: string;
}

export const VerifyEmailView = ({
  email,
}: VerifyEmailViewProps): React.JSX.Element => <WaitingState email={email} />;

/**
 * Waiting state component (when no token provided)
 */
const WaitingState = ({ email }: { email?: string }): React.JSX.Element => (
  <div className="space-y-5">
    <div className="text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex size-14 items-center justify-center rounded-xl bg-ember-50 text-ember-400 sm:size-16"
      >
        <Mail className="size-6 sm:size-7" strokeWidth={2} />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-ink-400 sm:mt-6 sm:text-3xl">
        Проверьте вашу почту
      </h2>
      <p className="mt-2 text-sm text-ink-100 sm:text-base">
        Мы отправили код для подтверждения
        {email && (
          <>
            {" "}
            на{" "}
            <span className="break-all font-medium text-ink-400">
              {email}
            </span>
          </>
        )}
      </p>
    </div>

    <div className="rounded-xl border border-ember-400/20 bg-ember-50/70 p-3.5 sm:p-4">
      <p className="text-sm leading-relaxed text-ember-600">
        Введите код из письма, чтобы активировать ваш аккаунт.
      </p>
    </div>

    <div className="rounded-xl border border-bone-300 bg-bone-100 p-3.5 sm:p-4">
      <p className="text-sm leading-relaxed text-ink-100">
        Не получили письмо? Проверьте папку «Спам» или запросите новый код на
        странице входа.
      </p>
    </div>

    <Button
      variant="outline"
      size="lg"
      className="w-full"
      onClick={() => (window.location.href = "/login")}
    >
      Вернуться к входу
    </Button>
  </div>
);

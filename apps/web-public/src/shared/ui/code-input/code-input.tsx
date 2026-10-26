"use client";

/**
 * Компонент ввода 6-значного кода верификации
 * - 6 отдельных полей для каждой цифры
 * - Автофокус и автопереход между полями
 * - Поддержка вставки из буфера обмена
 * - Backspace переходит на предыдущее поле
 */

import {
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";

import { useT } from "@eventflow/i18n/react";
import { cn } from "@shared/lib";

import { MotionFadeIn } from "../motion";

interface CodeInputProps {
  code: string[];
  onChange: (code: string[]) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const CodeInput = ({
  code,
  onChange,
  error,
  disabled = false,
  className,
}: CodeInputProps): React.JSX.Element => {
  const t = useT();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string): void => {
    // Только цифры
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Только последняя цифра
    onChange(newCode);

    // Автофокус на следующее поле
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCode = pastedData
      .split("")
      .concat(Array(6).fill(""))
      .slice(0, 6);
    onChange(newCode);

    // Фокус на последнее заполненное поле
    const lastFilledIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-center gap-2 sm:gap-3">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleChange(index, e.target.value)
            }
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={cn(
              "h-12 w-10 rounded-xl border-2 text-center text-xl font-bold transition-all sm:h-14 sm:w-12 sm:text-2xl",
              "focus:outline-none focus:ring-2 focus:ring-ember-400/30 focus:ring-offset-2",
              error
                ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
                : "border-bone-400 bg-white text-ink-400 hover:border-ink-50 focus:border-ember-400",
              disabled && "cursor-not-allowed opacity-50"
            )}
            autoFocus={index === 0}
            aria-label={t("public.shared.digitOf", { index: index + 1, total: 6 })}
          />
        ))}
      </div>
      {error && (
        <MotionFadeIn direction="none">
          <p
            className="text-center text-sm font-medium text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        </MotionFadeIn>
      )}
    </div>
  );
};

/**
 * @module shared/ui/password-strength
 * @description Индикатор надежности пароля с визуальной обратной связью
 */

"use client";

import { Check, X } from "lucide-react";

import { useT } from "@eventflow/i18n/react";
import { cn } from "@shared/lib/utils";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  labelKey: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    labelKey: "public.shared.passwordMin",
    test: (pwd) => pwd.length >= 8,
  },
  {
    labelKey: "public.shared.passwordUppercase",
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    labelKey: "public.shared.passwordLowercase",
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    labelKey: "public.shared.passwordNumber",
    test: (pwd) => /\d/.test(pwd),
  },
  {
    labelKey: "public.shared.passwordSpecial",
    test: (pwd) => /[@$!%*?&]/.test(pwd),
  },
];

/**
 * Вычисляет силу пароля (0-100)
 */
function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;

  // Длина
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Сложность
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/\d/.test(password)) strength += 15;
  if (/[@$!%*?&]/.test(password)) strength += 15;

  return Math.min(strength, 100);
}

/**
 * Определяет уровень и цвет на основе силы
 */
function getStrengthLevel(strength: number): {
  levelKey: string;
  color: string;
  gradient: string;
} {
  if (strength === 0) {
    return {
      levelKey: "public.shared.passwordUnset",
      color: "bg-bone-300",
      gradient: "from-bone-400 to-bone-300",
    };
  }
  if (strength < 40) {
    return {
      levelKey: "public.shared.passwordWeak",
      color: "bg-[var(--danger)]",
      gradient: "from-[var(--danger)] to-[var(--danger)]",
    };
  }
  if (strength < 70) {
    return {
      levelKey: "public.shared.passwordMedium",
      color: "bg-ember-400",
      gradient: "from-ember-500 to-ember-300",
    };
  }
  return {
    levelKey: "public.shared.passwordStrong",
    color: "bg-forest-500",
    gradient: "from-forest-600 to-forest-300",
  };
}

// eslint-disable-next-line complexity -- UI компонент с множеством визуальных состояний
export function PasswordStrength({
  password,
  showRequirements = true,
}: PasswordStrengthProps): React.ReactNode {
  const t = useT();
  const strength = calculatePasswordStrength(password);
  const { levelKey, gradient } = getStrengthLevel(strength);

  const metRequirements = requirements.filter((req) => req.test(password));
  const allRequirementsMet = metRequirements.length === requirements.length;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-100">
            {t("public.shared.passwordStrength")}
          </span>
          <span
            className={cn(
              "text-xs font-semibold",
              strength === 0 && "text-ink-100",
              strength > 0 && strength < 40 && "text-[var(--danger)]",
              strength >= 40 && strength < 70 && "text-ember-500",
              strength >= 70 && "text-forest-600"
            )}
          >
            {t(levelKey)}
          </span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full bg-bone-200">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-all duration-500",
              gradient
            )}
            style={{ width: `${strength}%` }}
          >
            {/* Shine effect */}
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && password && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-ink-100">
            {t("public.shared.passwordRequirements")}
          </p>
          <ul className="space-y-1.5">
            {requirements.map((req, index) => {
              const isMet = req.test(password);
              return (
                <li
                  key={index}
                  className={cn(
                    "flex items-center gap-2 text-xs transition-colors",
                    isMet ? "text-forest-500" : "text-ink-100"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full transition-all",
                      isMet
                        ? "bg-forest-50 text-forest-600"
                        : "bg-bone-200 text-ink-50"
                    )}
                  >
                    {isMet ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : (
                      <X className="h-3 w-3" aria-hidden />
                    )}
                  </div>
                  {t(req.labelKey)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {allRequirementsMet && (
        <div className="flex items-center gap-2 rounded-lg bg-forest-50 px-3 py-2 text-xs text-forest-500">
          <Check className="h-4 w-4" aria-hidden />
          {t("public.shared.passwordGreat")}
        </div>
      )}
    </div>
  );
}

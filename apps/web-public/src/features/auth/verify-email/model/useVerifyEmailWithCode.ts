"use client";

/**
 * Хук для верификации email с 6-значным кодом
 * Используется после регистрации пользователя
 */

import { useRouter } from "next/navigation";

import { useLocale } from "@eventflow/i18n/react";

import { VerificationCodeTypeEnum } from "@shared/api";
import {
  workspaceBillingIntentPath,
  type SignupPlanKey,
} from "@shared/lib/billing-intent";
import { useEmailVerification } from "@shared/lib/hooks/useEmailVerification";
import { withLocalePath } from "@shared/lib/i18n-routing";

interface UseVerifyEmailWithCodeProps {
  email: string;
  accountType?: "user" | "organizer";
  /** Paid plan preselected by a /pricing CTA (P-7); organizer flow only. */
  plan?: SignupPlanKey | null;
}

type UseEmailVerificationReturn = ReturnType<typeof useEmailVerification>;

const ORGANIZER_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://app.localhost";

export const useVerifyEmailWithCode = ({
  email,
  accountType = "user",
  plan = null,
}: UseVerifyEmailWithCodeProps): UseEmailVerificationReturn => {
  const locale = useLocale();
  const router = useRouter();

  const verification = useEmailVerification({
    email,
    type: VerificationCodeTypeEnum.EMAIL_VERIFICATION,
    onSuccess: () => {
      // Перенаправляем в зависимости от типа пользователя
      setTimeout(() => {
        if (accountType === "organizer") {
          // Организаторы продолжают работу в отдельном приложении.
          // P-7: план из /pricing доводит до /settings/billing с преселектом.
          window.location.assign(
            plan
              ? `${ORGANIZER_APP_URL}${workspaceBillingIntentPath(plan)}`
              : ORGANIZER_APP_URL
          );
        } else {
          // После автологина пользователь должен оставаться в приложении
          router.push(withLocalePath("/", locale));
        }
      }, 2000);
    },
  });

  return verification;
};

/**
 * Hook для обработки OAuth callback
 *
 * Инкапсулирует логику:
 * - Bootstrap HttpOnly-cookie session и CSRF
 * - Приёма legacy bearer redirect только как временного compatibility fallback
 * - Session bootstrap для определения actor type и current user
 * - Перенаправления по query-параметру isOnboardingCompleted из URL редиректа (бэкенд передаёт true/false)
 * - На страницу дополнения профиля — только при !isOnboardingCompleted
 *
 * При OAuth авторизации пользователь всегда USER, но actor type синхронизируем
 * через session/me, чтобы не держать второй источник правды.
 */

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useLocale } from "@eventflow/i18n/react";
import { useQueryClient } from "@tanstack/react-query";

import { authService } from "@shared/api";
import { CURRENT_USER_QUERY_KEY, setTokens } from "@shared/lib";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { rotatePublicQueryScope } from "@shared/lib/queryClient";

interface UseOAuthCallbackParams {
  isReady: boolean;
  cookieSession: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  isOnboardingCompleted: string | null;
}

interface UseOAuthCallbackResult {
  isProcessing: boolean;
}

export function useOAuthCallback({
  isReady,
  cookieSession,
  accessToken,
  refreshToken,
  isOnboardingCompleted,
}: UseOAuthCallbackParams): UseOAuthCallbackResult {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(true);

  // eslint-disable-next-line no-restricted-syntax -- Допустимо в кастомном хуке для инкапсуляции побочных эффектов
  useEffect(() => {
    if (!isReady) {
      return;
    }

    const handleOAuthCallback = async (): Promise<void> => {
      if (!cookieSession && (!accessToken || !refreshToken)) {
        setIsProcessing(false);
        return;
      }

      try {
        if (accessToken && refreshToken) {
          setTokens(accessToken, refreshToken);
        }
        if (cookieSession) {
          await authService.bootstrapWebCsrf();
        }
        rotatePublicQueryScope("personal");
        const currentUser = await authService.getCurrentUser();

        if (!("authProvider" in currentUser)) {
          throw new Error("OAuth callback resolved non-user actor");
        }

        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, currentUser);

        // Бэкенд передаёт isOnboardingCompleted в URL редиректа после OAuth
        const onboardingCompleted = isOnboardingCompleted === "true";

        if (onboardingCompleted) {
          router.replace(withLocalePath("/", locale));
        } else {
          router.replace(withLocalePath("/complete-profile", locale));
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        router.replace(withLocalePath("/complete-profile", locale));
      } finally {
        setIsProcessing(false);
      }
    };

    void handleOAuthCallback();
  }, [
    accessToken,
    cookieSession,
    isOnboardingCompleted,
    isReady,
    locale,
    queryClient,
    refreshToken,
    router,
  ]);

  return { isProcessing };
}

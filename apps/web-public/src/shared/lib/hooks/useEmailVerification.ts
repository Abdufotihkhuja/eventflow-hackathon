/**
 * Хук для управления верификацией email с 6-значными кодами
 * - Управление состоянием кода (6 цифр)
 * - Таймеры для срока действия кода (5 минут) и повторной отправки (60 секунд)
 * - Валидация и отправка кода
 * - Повторная отправка кода
 */

import { useState, useCallback, useRef } from "react";

import { useMutation } from "@tanstack/react-query";

import {
  verificationService,
  type VerificationCodeType,
  type VerifyEmailRequest,
  type ResendCodeRequest,
} from "@shared/api";

import { useInterval } from "./useInterval";

interface UseEmailVerificationProps {
  email: string;
  type: VerificationCodeType;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseEmailVerificationReturn {
  code: string[];
  setCode: (code: string[]) => void;
  timeLeft: number;
  resendTimeLeft: number;
  canResend: boolean;
  isCodeExpired: boolean;
  error: string;
  loading: boolean;
  verifyCode: () => Promise<boolean>;
  verifyWithCode: (codeArray: string[]) => Promise<boolean>;
  resendCode: () => Promise<void>;
  resetTimer: () => void;
}

const CODE_EXPIRY_TIME = 300; // 5 минут
const RESEND_COOLDOWN_TIME = 60; // 60 секунд

export const useEmailVerification = ({
  email,
  type,
  onSuccess,
  onError,
}: UseEmailVerificationProps): UseEmailVerificationReturn => {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRY_TIME);
  const [resendTimeLeft, setResendTimeLeft] = useState(RESEND_COOLDOWN_TIME);
  const [error, setError] = useState("");

  // Ref для хранения актуального кода (для использования в колбэках)
  const codeRef = useRef(code);
  codeRef.current = code;

  // Таймер для срока действия кода (5 минут)
  useInterval(
    () => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    },
    timeLeft > 0 ? 1000 : null
  );

  // Таймер для повторной отправки (60 секунд)
  useInterval(
    () => {
      setResendTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    },
    resendTimeLeft > 0 ? 1000 : null
  );

  // Мутация для верификации кода
  const verifyMutation = useMutation({
    mutationFn: (data: VerifyEmailRequest) =>
      verificationService.verifyEmail(data),
    onSuccess: () => {
      setError("");
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || "Ошибка проверки кода");
      onError?.(err);
    },
  });

  // Мутация для повторной отправки кода
  const resendMutation = useMutation({
    mutationFn: (data: ResendCodeRequest) =>
      verificationService.resendCode(data),
    onSuccess: () => {
      setCode(["", "", "", "", "", ""]);
      setTimeLeft(CODE_EXPIRY_TIME);
      setResendTimeLeft(RESEND_COOLDOWN_TIME);
      setError("");
    },
    onError: (err: Error) => {
      setError(err.message || "Ошибка отправки кода");
    },
  });

  // Функция верификации кода с переданным массивом (для автоматической верификации)
  const verifyWithCode = useCallback(
    async (codeArray: string[]): Promise<boolean> => {
      const codeString = codeArray.join("");
      if (codeString.length !== 6) {
        setError("Введите все 6 цифр");
        return false;
      }

      if (timeLeft === 0) {
        setError("Код истек. Запросите новый код");
        return false;
      }

      setError("");

      try {
        await verifyMutation.mutateAsync({
          email,
          code: codeString,
        });
        return true;
      } catch {
        return false;
      }
    },
    [email, timeLeft, verifyMutation]
  );

  // Функция верификации кода из текущего состояния
  const verifyCode = useCallback(async (): Promise<boolean> => {
    return verifyWithCode(codeRef.current);
  }, [verifyWithCode]);

  // Функция повторной отправки кода
  // Разрешена когда: resendTimeLeft === 0 ИЛИ код истек (timeLeft === 0)
  const resendCode = useCallback(async (): Promise<void> => {
    // Если код не истек и cooldown не прошел - не даем отправить
    if (timeLeft > 0 && resendTimeLeft > 0) {
      setError(`Подождите ${resendTimeLeft} сек перед повторной отправкой`);
      return;
    }

    setError("");
    await resendMutation.mutateAsync({ email, type });
  }, [email, type, timeLeft, resendTimeLeft, resendMutation]);

  // Функция сброса таймеров
  const resetTimer = useCallback(() => {
    setTimeLeft(CODE_EXPIRY_TIME);
    setResendTimeLeft(RESEND_COOLDOWN_TIME);
    setCode(["", "", "", "", "", ""]);
    setError("");
  }, []);

  // Можно повторно отправить если: cooldown прошел ИЛИ код истек
  const canResend = resendTimeLeft === 0 || timeLeft === 0;
  const isCodeExpired = timeLeft === 0;

  return {
    code,
    setCode,
    timeLeft,
    resendTimeLeft,
    canResend,
    isCodeExpired,
    error,
    loading: verifyMutation.isPending || resendMutation.isPending,
    verifyCode,
    verifyWithCode,
    resendCode,
    resetTimer,
  };
};

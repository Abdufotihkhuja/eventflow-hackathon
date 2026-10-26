import { useEffect, useRef } from "react";

/**
 * Запускает верификацию один раз при появлении code в URL (например из QR).
 * Побочный эффект инкапсулирован в хуке (не в прикладном компоненте).
 */
export function useVerifyCertificateOnCode(
  codeFromUrl: string,
  runVerify: (code: string) => void
): void {
  const hasRun = useRef(false);
  // Хук для однократного запуска верификации по code из URL; useEffect допустим в shared-хуках.
  // eslint-disable-next-line no-restricted-syntax -- инкапсулированный side-effect в кастомном хуке
  useEffect(() => {
    if (!codeFromUrl || hasRun.current) return;
    hasRun.current = true;
    runVerify(codeFromUrl);
  }, [codeFromUrl, runVerify]);
}

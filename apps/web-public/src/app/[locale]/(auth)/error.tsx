"use client";

import { useEffect } from "react";

import { useLocale, useT } from "@eventflow/i18n/react";
import { Home, RotateCw } from "lucide-react";

import { withLocalePath } from "@shared/lib/i18n-routing";
import { Button, buttonStyles } from "@shared/ui/button";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { Surface } from "@shared/ui/surface";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactNode {
  const t = useT();
  const locale = useLocale();

  // eslint-disable-next-line no-restricted-syntax -- error boundaries log the caught error on mount
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Surface variant="glassStrong" radius="3xl" padding="lg">
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink-400">
              {t("public.error.title")}
            </h1>
            <p className="mx-auto max-w-sm text-base text-ink-100">
              {t("public.error.description")}
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<RotateCw className="h-5 w-5" />}
              onClick={reset}
            >
              {t("public.error.retry")}
            </Button>
            <Link
              href={withLocalePath("/", locale)}
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              <Home className="h-5 w-5" />
              <span>{t("public.error.home")}</span>
            </Link>
          </div>
        </Surface>
      </div>
    </div>
  );
}

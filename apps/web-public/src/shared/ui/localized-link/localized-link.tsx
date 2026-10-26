"use client";

import NextLink from "next/link";

import { useLocale } from "@eventflow/i18n/react";

import { withLocalePath } from "@shared/lib/i18n-routing";

import type { ComponentProps } from "react";

type LocalizedLinkProps = ComponentProps<typeof NextLink>;

export function LocalizedLink({
  href,
  ...props
}: LocalizedLinkProps): React.ReactNode {
  const locale = useLocale();
  const localizedHref =
    typeof href === "string" ? withLocalePath(href, locale) : href;

  return <NextLink href={localizedHref} {...props} />;
}

"use client";

/**
 * Универсальный компонент изображений.
 * next.config разрешает все внешние домены (hostname: "**"),
 * поэтому все http(s) URL и относительные пути проходят через next/image.
 * Шаблоны (template:/gradient:) и data-URL рендерятся нативным <img>.
 */

import Image from "next/image";

import { cn } from "@shared/lib/utils";

function canUseNextImage(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("data:")) return false;
  if (src.startsWith("template:") || src.startsWith("gradient:")) return false;
  return true;
}

export interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export function SafeImage({
  src,
  alt,
  fill = false,
  sizes,
  className,
  priority = false,
}: SafeImageProps): React.ReactNode {
  if (canUseNextImage(src)) {
    // A default `sizes` for fill images keeps next/image from generating a
    // full-width (100vw) srcset for what are usually card-sized thumbnails.
    const resolvedSizes =
      sizes ??
      (fill
        ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        : undefined);
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        sizes={resolvedSizes}
        className={className}
        priority={priority}
        unoptimized={src.includes("googleusercontent.com")}
      />
    );
  }

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

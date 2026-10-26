/**
 * Компонент для отображения изображения или градиента события.
 * Поддерживает любые внешние URL (drive.google.com и т.д.) через SafeImage.
 */

import { cn } from "@shared/lib/utils";
import { SafeImage } from "@shared/ui/safe-image";

import { processImageValue, type ImageResult } from "../lib/image-templates";

interface EventImageProps {
  coverImage?: string | null;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /**
   * Дополнительный контент поверх изображения/градиента
   */
  children?: React.ReactNode;
}

/**
 * Компонент для отображения обложки события
 * Автоматически определяет тип (изображение или градиент) и отображает соответственно
 */
export function EventImage({
  coverImage,
  alt,
  fill = true,
  sizes,
  className,
  priority = false,
  children,
}: EventImageProps): React.ReactNode {
  const imageResult: ImageResult = processImageValue(coverImage);

  if (imageResult.type === "gradient") {
    // Отображаем градиент
    return (
      <div
        className={cn("relative h-full w-full", imageResult.value, className)}
        role="img"
        aria-label={alt}
      >
        {children}
      </div>
    );
  }

  // Отображаем изображение (SafeImage поддерживает любые внешние ссылки)
  return (
    <div className="relative h-full w-full">
      <SafeImage
        src={imageResult.value}
        alt={alt}
        fill={fill}
        sizes={sizes}
        className={className}
        priority={priority}
      />
      {children}
    </div>
  );
}

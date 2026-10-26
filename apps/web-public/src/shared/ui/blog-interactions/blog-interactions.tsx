/**
 * @module shared/ui/blog-interactions
 * @description Компоненты взаимодействия с блог-постом (лайк, сохранение)
 * Отображаются только для авторизованных пользователей
 */

"use client";

import { useT } from "@eventflow/i18n/react";
import { Heart, Bookmark, BookmarkCheck } from "lucide-react";

import { useBlogPostInteractions } from "@/shared/lib/hooks";
import { cn } from "@/shared/lib/utils";

import { AnimatedToggleButton } from "../animated-toggle-button";

// ============================================================================
// Like Button
// ============================================================================

interface LikeButtonProps {
  postId: string;
  variant?: "icon" | "button" | "compact";
  showCount?: boolean;
  className?: string;
  /** Вызывается при ошибке (в т.ч. 401) — показать тост */
  onError?: (error: unknown) => void;
  /** Lazy: запрашивать состояние лайка только при true (по умолчанию true) */
  enabled?: boolean;
}

export function LikeButton({
  postId,
  variant = "icon",
  showCount = true,
  className,
  onError,
  enabled = true,
}: LikeButtonProps) {
  const t = useT();
  const { isAuthenticated, isLiked, likesCount, isLikeLoading, toggleLike } =
    useBlogPostInteractions(postId, { onLikeError: onError, enabled });

  if (!isAuthenticated) {
    return null;
  }

  const toggleVariant: "icon" | "compact" | "pill" =
    variant === "button" ? "pill" : variant;

  const idleIcon = <Heart className="size-full" />;
  const activeIcon = <Heart className="size-full fill-current" />;

  return (
    <AnimatedToggleButton
      variant={toggleVariant}
      flavor="like"
      size="md"
      isActive={isLiked}
      isLoading={isLikeLoading}
      onToggle={toggleLike}
      idleIcon={idleIcon}
      activeIcon={activeIcon}
      idleLabel={
        variant === "button" ? t("public.blogArticle.likeLabel") : undefined
      }
      activeLabel={
        variant === "button" ? t("public.blogArticle.likedLabel") : undefined
      }
      count={showCount ? likesCount : undefined}
      ariaLabelIdle={t("public.blogArticle.likeAria")}
      ariaLabelActive={t("public.blogArticle.unlikeAria")}
      className={cn(className)}
    />
  );
}

// ============================================================================
// Save Button
// ============================================================================

interface SaveButtonProps {
  postId: string;
  variant?: "icon" | "button" | "compact";
  label?: string;
  className?: string;
  /** Вызывается при ошибке (в т.ч. 401) — показать тост */
  onError?: (error: unknown) => void;
  /** Lazy: запрашивать состояние сохранения только при true (по умолчанию true) */
  enabled?: boolean;
}

export function SaveButton({
  postId,
  variant = "icon",
  label,
  className,
  onError,
  enabled = true,
}: SaveButtonProps) {
  const t = useT();
  const { isAuthenticated, isSaved, isSaveLoading, toggleSave } =
    useBlogPostInteractions(postId, { onSaveError: onError, enabled });

  if (!isAuthenticated) {
    return null;
  }

  const toggleVariant: "icon" | "compact" | "pill" =
    variant === "button" ? "pill" : variant;

  const idleIcon = <Bookmark className="size-full" />;
  const activeIcon = <BookmarkCheck className="size-full" />;

  const idleLabel = label ?? t("public.blogArticle.save");
  const activeLabel = label ?? t("public.blogArticle.savedLabel");

  return (
    <AnimatedToggleButton
      variant={toggleVariant}
      flavor="save"
      size="md"
      isActive={isSaved}
      isLoading={isSaveLoading}
      onToggle={toggleSave}
      idleIcon={idleIcon}
      activeIcon={activeIcon}
      idleLabel={variant === "button" ? idleLabel : undefined}
      activeLabel={variant === "button" ? activeLabel : undefined}
      ariaLabelIdle={t("public.blogArticle.save")}
      ariaLabelActive={t("public.blogArticle.removeFromSaved")}
      className={cn(className)}
    />
  );
}

// ============================================================================
// Combined Interactions Bar
// ============================================================================

interface BlogInteractionsBarProps {
  postId: string;
  /** Вариант отображения */
  variant?: "floating" | "inline" | "card";
  /** Дополнительные классы */
  className?: string;
  /** Lazy: запрашивать состояние только при true */
  enabled?: boolean;
}

export function BlogInteractionsBar({
  postId,
  variant = "inline",
  className,
  enabled = true,
}: BlogInteractionsBarProps) {
  const { isAuthenticated } = useBlogPostInteractions(postId, { enabled });

  if (!isAuthenticated) {
    return null;
  }

  if (variant === "floating") {
    return (
      <div
        className={cn(
          "fixed bottom-6 right-6 z-40 flex flex-col gap-2",
          className
        )}
      >
        <LikeButton postId={postId} variant="icon" showCount={false} />
        <SaveButton postId={postId} variant="icon" />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <LikeButton postId={postId} variant="compact" />
        <SaveButton postId={postId} variant="compact" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LikeButton postId={postId} variant="button" />
      <SaveButton postId={postId} variant="button" />
    </div>
  );
}

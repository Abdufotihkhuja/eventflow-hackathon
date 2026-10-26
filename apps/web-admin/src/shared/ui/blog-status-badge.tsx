/**
 * Badge для отображения статуса статьи блога
 * @module shared/ui/blog-status-badge
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/cn";
import type { BlogPostStatus } from "@api/services";

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border transition-colors",
  {
    variants: {
      status: {
        DRAFT: "bg-neutral-soft text-neutral-soft-foreground border-transparent",
        PENDING_REVIEW: "bg-warning-soft text-warning-soft-foreground border-transparent",
        APPROVED: "bg-success-soft text-success-soft-foreground border-transparent",
        REJECTED: "bg-danger-soft text-danger-soft-foreground border-transparent",
        PUBLISHED: "bg-info-soft text-info-soft-foreground border-transparent",
      },
    },
    defaultVariants: {
      status: "DRAFT",
    },
  }
);

const statusLabels: Record<BlogPostStatus, string> = {
  DRAFT: "Черновик",
  PENDING_REVIEW: "На модерации",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
  PUBLISHED: "Опубликовано",
};

type BlogStatusBadgeProps = VariantProps<typeof badgeVariants> & {
  status: BlogPostStatus;
  className?: string;
};

export function BlogStatusBadge({ status, className }: BlogStatusBadgeProps) {
  return (
    <span className={cn(badgeVariants({ status }), className)}>
      {statusLabels[status]}
    </span>
  );
}

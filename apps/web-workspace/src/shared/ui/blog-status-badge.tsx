/**
 * Badge для отображения статуса статьи блога
 * @module shared/ui/blog-status-badge
 */

import { cva, type VariantProps } from "class-variance-authority";
import { useT } from "@eventflow/i18n/react";
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
        PUBLISHED: "bg-primary/10 text-primary border-primary/20",
      },
    },
    defaultVariants: {
      status: "DRAFT",
    },
  }
);

const statusLabelKeys: Record<BlogPostStatus, string> = {
  DRAFT: "blog.status.draft",
  PENDING_REVIEW: "blog.status.pendingReview",
  APPROVED: "blog.status.approved",
  REJECTED: "blog.status.rejected",
  PUBLISHED: "blog.status.published",
};

type BlogStatusBadgeProps = VariantProps<typeof badgeVariants> & {
  status: BlogPostStatus;
  className?: string;
};

export function BlogStatusBadge({ status, className }: BlogStatusBadgeProps) {
  const t = useT();

  return (
    <span className={cn(badgeVariants({ status }), className)}>
      {t(statusLabelKeys[status])}
    </span>
  );
}

import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/utils";

export type ContainerSize = "narrow" | "wide";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  size?: ContainerSize;
  as?: ElementType;
  children?: ReactNode;
}

const sizeClass: Record<ContainerSize, string> = {
  narrow: "container-narrow",
  wide: "container-wide",
};

export function Container({
  size = "wide",
  as: Tag = "div",
  className,
  children,
  ...props
}: ContainerProps): React.ReactNode {
  return (
    <Tag className={cn(sizeClass[size], className)} {...props}>
      {children}
    </Tag>
  );
}

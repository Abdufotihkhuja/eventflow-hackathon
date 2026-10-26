import { cn } from '@shared/lib/cn'

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  shimmer?: boolean
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted',
        shimmer 
          ? 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent'
          : 'animate-pulse',
        className
      )}
      {...props}
    />
  )
}

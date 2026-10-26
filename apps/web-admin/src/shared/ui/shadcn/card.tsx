import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'

import { cn } from '@shared/lib/cn'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-border bg-card p-5 shadow-soft',
      interactive &&
        'cursor-pointer transition-shadow duration-150 hover:shadow-soft-lg hover:border-foreground/15 focus-within:border-foreground/15',
      className
    )}
    {...props}
  />
))

Card.displayName = 'Card'

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4 space-y-1.5', className)} {...props} />
  )
)

CardHeader.displayName = 'CardHeader'

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)

CardDescription.displayName = 'CardDescription'

export type CardContentProps = HTMLAttributes<HTMLDivElement>

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-3', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

export type CardFooterProps = HTMLAttributes<HTMLDivElement>

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mt-4 flex items-center justify-between pt-4 border-t border-border/40',
        className
      )}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'

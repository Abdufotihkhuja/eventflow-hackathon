import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

import { cn } from '@shared/lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-primary/50 hover:border-border/80 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

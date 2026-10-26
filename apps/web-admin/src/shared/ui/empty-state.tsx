import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

import { Button, type ButtonProps } from './shadcn/button'

type EmptyStateAction = {
  label: string
  onClick?: () => void
  variant?: ButtonProps['variant']
  asChild?: boolean
  children?: ReactNode
}

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  className?: string
}

function ActionButton({
  action,
  defaultVariant,
}: {
  action: EmptyStateAction
  defaultVariant: ButtonProps['variant']
}) {
  if (action.asChild && action.children) {
    return (
      <Button asChild variant={action.variant ?? defaultVariant}>
        {action.children}
      </Button>
    )
  }
  return (
    <Button variant={action.variant ?? defaultVariant} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} defaultVariant="default" />}
          {secondaryAction && (
            <ActionButton action={secondaryAction} defaultVariant="outline" />
          )}
        </div>
      )}
    </div>
  )
}

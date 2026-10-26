/**
 * Компонент для переключения статуса топового события
 * Используется в таблице событий Super Admin
 */

import { Star } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { cn } from '@shared/lib/cn'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/ui'

type FeaturedEventToggleProps = {
  isFeatured: boolean
  onToggle: () => void
  isPending?: boolean
  disabled?: boolean
}

export function FeaturedEventToggle({
  isFeatured,
  onToggle,
  isPending,
  disabled,
}: FeaturedEventToggleProps) {
  const t = useT()

  const label = isFeatured
    ? t('admin.events.hints.removeFeaturedShort')
    : t('admin.events.hints.addFeaturedShort')

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={e => {
              e.stopPropagation()
              onToggle()
            }}
            disabled={disabled || isPending}
            aria-pressed={isFeatured}
            aria-label={label}
            className={cn(
              'size-8',
              isFeatured ? 'text-warning' : 'text-muted-foreground'
            )}
          >
            <Star
              className={cn('size-4', isFeatured && 'fill-current')}
              aria-hidden="true"
            />
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="text-xs font-medium">
            {isFeatured
              ? t('admin.events.hints.removeFeatured')
              : t('admin.events.hints.addFeatured')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isFeatured
              ? t('admin.events.hints.featuredHidden')
              : t('admin.events.hints.featuredVisible')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

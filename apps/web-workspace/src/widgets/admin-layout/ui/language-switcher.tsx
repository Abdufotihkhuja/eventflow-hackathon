import { useLanguageSwitcher } from '@eventflow/i18n/react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@shared/lib/cn'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LocaleFlag,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@shared/ui'

type LanguageSwitcherProps = {
  compact?: boolean
  className?: string
}

export function LanguageSwitcher({ compact = true, className }: LanguageSwitcherProps) {
  const { locale, setLocale, options, currentLanguage, selectLanguageLabel } =
    useLanguageSwitcher()

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={selectLanguageLabel}
              className={cn(
                'h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/40',
                className
              )}
            >
              <LocaleFlag locale={locale} />
              <span className={cn('truncate text-[13px] font-medium', compact && 'hidden sm:inline')}>
                {currentLanguage.label}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{selectLanguageLabel}</TooltipContent>

        <DropdownMenuContent align="end" className="w-48 p-1.5">
          {options.map(option => (
            <DropdownMenuItem
              key={option.locale}
              onSelect={() => setLocale(option.locale)}
              aria-current={option.isCurrent ? 'true' : undefined}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-md py-2',
                option.isCurrent && 'bg-accent text-accent-foreground focus:bg-accent'
              )}
            >
              <LocaleFlag locale={option.locale} />
              <span className="flex-1 truncate text-sm font-medium">{option.label}</span>
              {option.isCurrent && (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  )
}

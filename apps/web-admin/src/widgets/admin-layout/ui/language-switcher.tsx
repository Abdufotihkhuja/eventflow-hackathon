import { useLanguageSwitcher } from '@eventflow/i18n/react'
import { Languages } from 'lucide-react'

import { cn } from '@shared/lib/cn'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@shared/ui'

type LanguageSwitcherProps = {
  compact?: boolean
  className?: string
}

export function LanguageSwitcher({ compact = true, className }: LanguageSwitcherProps) {
  const { locale, setLocale, options, currentLanguage, languageLabel, selectLanguageLabel } =
    useLanguageSwitcher()

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={selectLanguageLabel}
              className={cn('h-9 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground', className)}
            >
              <Languages className="size-4" aria-hidden="true" />
              <span className={cn('text-xs font-medium', compact && 'hidden sm:inline')}>
                {currentLanguage.label}
              </span>
              <span className="rounded-sm bg-muted px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {currentLanguage.shortLabel}
              </span>
              <span className="sr-only">{selectLanguageLabel}</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{selectLanguageLabel}</TooltipContent>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            {languageLabel}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={locale} onValueChange={setLocale}>
            {options.map(option => (
              <DropdownMenuRadioItem
                key={option.locale}
                value={option.locale}
                className="cursor-pointer"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-sm">{option.label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {option.shortLabel}
                  </span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  )
}

/**
 * Компонент переключения темы
 * Поддерживает светлую, темную и системную тему
 */

import { Moon, Sun, Monitor } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { useTheme } from '@shared/lib'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui'

export function ThemeToggle() {
  const t = useT()
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title={t('workspace.layout.theme.toggle')}>
          <Sun className="size-5 rotate-0 scale-100 transition dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 rotate-90 scale-0 transition dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('workspace.layout.theme.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="cursor-pointer"
          disabled={theme === 'light'}
        >
          <Sun className="mr-2 size-4" />
          <span>{t('workspace.layout.theme.light')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="cursor-pointer"
          disabled={theme === 'dark'}
        >
          <Moon className="mr-2 size-4" />
          <span>{t('workspace.layout.theme.dark')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="cursor-pointer"
          disabled={theme === 'system'}
        >
          <Monitor className="mr-2 size-4" />
          <span>{t('workspace.layout.theme.system')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

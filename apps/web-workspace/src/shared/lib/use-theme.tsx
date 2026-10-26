/**
 * Хук и провайдер для управления темой приложения
 * Поддерживает светлую, темную и системную тему
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Актуальная тема (с учетом system) */
  resolvedTheme: 'light' | 'dark'
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'eventflow-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Получаем тему из localStorage при инициализации
    const stored = localStorage.getItem(storageKey)
    return (stored as Theme) || defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = window.document.documentElement

    // Удаляем предыдущие классы
    root.classList.remove('light', 'dark')

    let actualTheme: 'light' | 'dark'

    if (theme === 'system') {
      // Определяем системную тему
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      actualTheme = systemTheme
    } else {
      actualTheme = theme
    }

    // Применяем тему
    root.classList.add(actualTheme)
    setResolvedTheme(actualTheme)

    // Сохраняем выбор в localStorage
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  // Слушаем изменения системной темы
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light'
      setResolvedTheme(systemTheme)
      window.document.documentElement.classList.remove('light', 'dark')
      window.document.documentElement.classList.add(systemTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const value: ThemeProviderState = {
    theme,
    setTheme,
    resolvedTheme,
  }

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

/**
 * Хук для использования темы
 */
export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

import { Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { useEventCategories } from '@features/events/api'
import { cn } from '@shared/lib/cn'

type EventCategoriesFieldProps = {
  value: string[]
  onChange: (next: string[]) => void
}

/**
 * Мульти-выбор тематик события (chips). Источник — публичный список активных
 * категорий; управление самими категориями доступно только супер-админу.
 */
export function EventCategoriesField({ value, onChange }: EventCategoriesFieldProps) {
  const t = useT()
  const { data: categories, isLoading, isError } = useEventCategories()
  const selected = value ?? []

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id))
    } else {
      onChange([...selected, id])
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading')}
      </div>
    )
  }

  if (isError || !categories || categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('events.form.categoriesEmpty')}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(category => {
        const isActive = selected.includes(category.id)
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => toggle(category.id)}
            aria-pressed={isActive}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'border-brand-secondary bg-brand-secondary/10 text-foreground shadow-sm'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted/30'
            )}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}

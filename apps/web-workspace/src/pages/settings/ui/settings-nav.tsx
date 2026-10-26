import { useEffect, useState } from 'react'

import { cn } from '@shared/lib/cn'

export type SettingsNavItem = {
  id: string
  label: string
}

type SettingsNavProps = {
  items: SettingsNavItem[]
  className?: string
}

/**
 * Sticky left subnav for the settings center. Smooth-scrolls to in-page
 * sections and highlights the one currently in view (scrollspy). On narrow
 * screens it collapses into a horizontal scroller above the content.
 */
export function SettingsNav({ items, className }: SettingsNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '')

  useEffect(() => {
    const sections = items
      .map(item => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [items])

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }

  return (
    <nav
      className={cn(
        'flex gap-1 overflow-x-auto lg:sticky lg:top-4 lg:flex-col lg:overflow-visible',
        className
      )}
      aria-label="Settings sections"
    >
      {items.map(item => {
        const isActive = item.id === activeId
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={event => handleClick(event, item.id)}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-md border px-3 py-2 text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'border-border bg-secondary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            )}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

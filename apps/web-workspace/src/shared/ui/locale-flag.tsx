import { cn } from '@shared/lib/cn'

export type LocaleFlagProps = {
  locale: string
  className?: string
}

/**
 * Crisp inline-SVG country flags for the language switcher. SVG (not emoji)
 * because flag emoji don't render on Windows/Chrome — they fall back to
 * letter pairs (GB/RU/UZ), which would look broken.
 *
 * Authored in a shared 20×14 viewBox and clipped to a rounded rect by the
 * wrapper so all three read as uniform pills regardless of true aspect ratio.
 */
function FlagEN() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden width="20" height="14">
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 20 14M20 0 0 14" stroke="#fff" strokeWidth="3" />
      <path d="M0 0 20 14M20 0 0 14" stroke="#C8102E" strokeWidth="1.6" />
      <rect x="8.2" width="3.6" height="14" fill="#fff" />
      <rect y="5.2" width="20" height="3.6" fill="#fff" />
      <rect x="8.8" width="2.4" height="14" fill="#C8102E" />
      <rect y="5.8" width="20" height="2.4" fill="#C8102E" />
    </svg>
  )
}

function FlagRU() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden width="20" height="14">
      <rect width="20" height="14" fill="#fff" />
      <rect y="4.667" width="20" height="4.667" fill="#0039A6" />
      <rect y="9.333" width="20" height="4.667" fill="#D52B1E" />
    </svg>
  )
}

function FlagUZ() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden width="20" height="14">
      <rect width="20" height="14" fill="#fff" />
      <rect width="20" height="4.5" fill="#0099B5" />
      <rect y="9.5" width="20" height="4.5" fill="#1EB53A" />
      <rect y="4.5" width="20" height="0.5" fill="#CE1126" />
      <rect y="9" width="20" height="0.5" fill="#CE1126" />
      <circle cx="3.4" cy="2.25" r="1.4" fill="#fff" />
      <circle cx="3.9" cy="2.25" r="1.15" fill="#0099B5" />
      <circle cx="6.1" cy="1.5" r="0.32" fill="#fff" />
      <circle cx="6.1" cy="3" r="0.32" fill="#fff" />
      <circle cx="7.4" cy="1.5" r="0.32" fill="#fff" />
      <circle cx="7.4" cy="3" r="0.32" fill="#fff" />
    </svg>
  )
}

const FLAGS: Record<string, () => React.ReactNode> = {
  en: FlagEN,
  ru: FlagRU,
  uz: FlagUZ,
}

export function LocaleFlag({ locale, className }: LocaleFlagProps) {
  const base = locale.toLowerCase().split('-')[0]
  const Flag = FLAGS[base] ?? FlagEN

  return (
    <span
      className={cn(
        // `!h/!w-full` defeats the ancestor `[&_svg]:size-4` rule on shadcn
        // DropdownMenuItem / Button, which would otherwise squash the 20×14
        // flag into a 16×16 square and shift it inside the clip box.
        'inline-flex h-[14px] w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] ring-1 ring-border [&>svg]:!h-full [&>svg]:!w-full',
        className
      )}
    >
      <Flag />
    </span>
  )
}

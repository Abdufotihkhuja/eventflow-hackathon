import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

/**
 * Canonical status pill tones. The first seven are the Eventflow design-system
 * "seven status pills" — every domain status must map to one of them so a state
 * is recognisable across the organizer cabinet and the super admin. The trailing
 * generic semantic tones exist for non-lifecycle states (e.g. a soft "info" chip).
 *
 * Do NOT invent a new pill colour for a new state — map it to the nearest tone.
 */
export type StatusPillTone =
  // seven canonical lifecycle pills
  | 'live'
  | 'scheduled'
  | 'draft'
  | 'paused'
  | 'ended'
  | 'cancelled'
  | 'soldout'
  // generic semantic tones
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'brand'

const toneClass: Record<StatusPillTone, string> = {
  live: 'bg-success-soft text-success-soft-foreground',
  scheduled: 'bg-info-soft text-info-soft-foreground',
  draft: 'bg-sunken text-fg-muted',
  paused: 'bg-warning-soft text-warning-soft-foreground',
  ended: 'border border-default bg-canvas text-fg-muted',
  cancelled: 'bg-danger-soft text-danger-soft-foreground',
  soldout: 'bg-foreground text-background',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-danger-soft text-danger-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  neutral: 'bg-sunken text-fg-muted',
  brand: 'bg-brand-soft text-brand-soft-foreground',
}

const sizeClass = {
  sm: 'h-5 px-2 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
} as const

type StatusPillProps = {
  tone: StatusPillTone
  children: ReactNode
  /** Show the leading status dot. Defaults to true; auto-hidden for solid tones. */
  dot?: boolean
  size?: keyof typeof sizeClass
  className?: string
}

/**
 * Soft-tinted status pill. State is communicated through tint + dot, never a
 * loud solid fill (except `soldout`, which is the deliberate solid-ink state).
 * Pass an already-translated label as children so i18n stays at the call site.
 */
export function StatusPill({ tone, children, dot, size = 'md', className }: StatusPillProps) {
  const showDot = dot ?? tone !== 'soldout'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold tracking-[0.01em]',
        sizeClass[size],
        toneClass[tone],
        className
      )}
    >
      {showDot && (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  )
}

/**
 * Maps a raw lifecycle status string (case-insensitive) onto one of the seven
 * canonical pill tones. Use as a starting point; pass an explicit `tone` when a
 * domain status doesn't fit. Returns `neutral` for anything unrecognised.
 */
export function statusPillTone(status: string | null | undefined): StatusPillTone {
  switch ((status ?? '').toLowerCase()) {
    case 'published':
    case 'active':
    case 'live':
    case 'approved':
    case 'confirmed':
    case 'attended':
    case 'checked_in':
    case 'checkedin':
    case 'going':
    case 'on_sale':
    case 'onsale':
      return 'live'
    case 'scheduled':
    case 'upcoming':
    case 'pending':
    case 'pending_review':
    case 'new':
    case 'invited':
      return 'scheduled'
    case 'draft':
    case 'unpublished':
      return 'draft'
    case 'paused':
    case 'under_review':
    case 'flagged':
    case 'suspended':
    case 'on_hold':
      return 'paused'
    case 'ended':
    case 'completed':
    case 'finished':
    case 'archived':
    case 'closed':
      return 'ended'
    case 'cancelled':
    case 'canceled':
    case 'rejected':
    case 'refunded':
    case 'banned':
    case 'failed':
      return 'cancelled'
    case 'sold_out':
    case 'soldout':
    case 'full':
      return 'soldout'
    default:
      return 'neutral'
  }
}

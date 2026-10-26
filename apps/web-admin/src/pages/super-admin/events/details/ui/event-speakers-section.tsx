/**
 * Read-only список спикеров события для супер-админа:
 * аватар, имя, позиция, компания, соцссылки, короткое био.
 */

import { ExternalLink, Mic2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { MEDIA_BASE_URL } from '@api/config'
import type { AdminEventSpeaker } from '@api/services/superAdmin.types'
import { Avatar, AvatarFallback, AvatarImage, EmptyState } from '@shared/ui'

type EventSpeakersSectionProps = {
  speakers: AdminEventSpeaker[]
}

function getMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http') || url.startsWith('blob:')) return url
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export function EventSpeakersSection({ speakers }: EventSpeakersSectionProps) {
  const t = useT()

  if (speakers.length === 0) {
    return (
      <EmptyState
        icon={Mic2}
        title={t('admin.events.details.speakersEmpty')}
        description={t('admin.events.details.speakersEmptyHint')}
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {speakers.map(speaker => {
        const fullName = `${speaker.firstName} ${speaker.lastName}`.trim()
        const initials = `${speaker.firstName[0] ?? ''}${speaker.lastName[0] ?? ''}`.toUpperCase()
        const links = [
          { href: speaker.linkedinUrl, label: 'LinkedIn' },
          { href: speaker.instagramUrl, label: 'Instagram' },
          { href: speaker.facebookUrl, label: 'Facebook' },
        ].filter((link): link is { href: string; label: string } => Boolean(link.href))

        return (
          <li
            key={speaker.id}
            className="flex gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Avatar className="size-11 shrink-0">
              <AvatarImage src={getMediaUrl(speaker.avatarUrl)} alt={fullName} />
              <AvatarFallback className="bg-muted text-sm font-medium text-foreground">
                {initials || '—'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {speaker.position}
                {speaker.company ? ` · ${speaker.company}` : ''}
              </p>
              {speaker.bio && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{speaker.bio}</p>
              )}
              {links.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {links.map(link => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {link.label}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

import { MessageSquareQuote, UserX } from 'lucide-react'
import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import type { InviteSummary } from '@api/services'

type DeclinedInvitesProps = {
  invites: InviteSummary[]
}

function inviteLabel(invite: InviteSummary): string {
  const name = `${invite.firstName ?? ''} ${invite.lastName ?? ''}`.trim()
  return name || invite.email
}

/**
 * Приглашения, от которых отказались. Раньше отказ выглядел как молчание:
 * приглашение просто пропадало из ожидающих, и было непонятно — человек не
 * увидел письмо или не хочет. Теперь виден и сам отказ, и комментарий, если
 * приглашённый его оставил.
 */
export function DeclinedInvites({ invites }: DeclinedInvitesProps) {
  const { t, locale } = useI18n()
  if (invites.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-secondary/50">
      <div className="flex items-center gap-3 p-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground">
          <UserX className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {t('users.page.declinedTitle', { count: invites.length })}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {t('users.page.declinedSubtitle')}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {invites.map(invite => (
          <li key={invite.id} className="px-4 py-2.5 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="truncate font-medium text-foreground">
                {inviteLabel(invite)}
              </p>
              {invite.declinedAt && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(invite.declinedAt, locale, {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
            <p className="truncate text-[13px] text-muted-foreground">
              {invite.email} · {invite.role.name}
            </p>
            {invite.declineReason ? (
              <p className="mt-1.5 flex gap-1.5 rounded-md bg-card px-2.5 py-2 text-[13px] text-foreground">
                <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words">{invite.declineReason}</span>
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-muted-foreground/80">
                {t('users.page.declinedNoReason')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

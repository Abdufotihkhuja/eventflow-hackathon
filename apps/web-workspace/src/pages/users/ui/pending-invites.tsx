import { Loader2, Send, X } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { InviteSummary } from '@api/services'
import { Button } from '@shared/ui'

type PendingInvitesProps = {
  invites: InviteSummary[]
  canManage: boolean
  isResending: boolean
  isRevoking: boolean
  onResendAll: () => void
  onRevoke: (inviteId: string) => void
}

function inviteLabel(invite: InviteSummary): string {
  const name = `${invite.firstName ?? ''} ${invite.lastName ?? ''}`.trim()
  return name || invite.email
}

export function PendingInvites({
  invites,
  canManage,
  isResending,
  isRevoking,
  onResendAll,
  onRevoke,
}: PendingInvitesProps) {
  const t = useT()
  if (invites.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-secondary/50">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground">
            <Send className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('users.page.pendingTitle', { count: invites.length })}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {t('users.page.pendingSubtitle')}
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResendAll}
            disabled={isResending}
            className="shrink-0"
          >
            {isResending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('users.page.resendAll')}
          </Button>
        )}
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {invites.map(invite => (
          <li
            key={invite.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{inviteLabel(invite)}</p>
              <p className="truncate text-[13px] text-muted-foreground">
                {invite.email} · {invite.role.name}
              </p>
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRevoke(invite.id)}
                disabled={isRevoking}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="mr-1 size-4" />
                {t('users.page.revoke')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

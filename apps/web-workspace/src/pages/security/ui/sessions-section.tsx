import { formatDistanceToNow } from 'date-fns'
import { Loader2, LogOut, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import type { SessionResponse } from '@api/services/auth.types'
import type { ApiError } from '@api/types'
import {
  useSessionsQuery,
  useTerminateOtherSessions,
  useTerminateSession,
} from '@features/profile'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Skeleton,
} from '@shared/ui'

function describeDevice(userAgent: string | null): { label: string; isMobile: boolean } {
  if (!userAgent) return { label: 'Unknown device', isMobile: false }
  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)
  const browser =
    /edg/i.test(userAgent) ? 'Edge'
    : /chrome|crios/i.test(userAgent) ? 'Chrome'
    : /firefox|fxios/i.test(userAgent) ? 'Firefox'
    : /safari/i.test(userAgent) ? 'Safari'
    : 'Browser'
  const os =
    /windows/i.test(userAgent) ? 'Windows'
    : /mac os|macintosh/i.test(userAgent) ? 'macOS'
    : /android/i.test(userAgent) ? 'Android'
    : /iphone|ipad|ios/i.test(userAgent) ? 'iOS'
    : /linux/i.test(userAgent) ? 'Linux'
    : ''
  return { label: os ? `${browser} · ${os}` : browser, isMobile }
}

export function SessionsSection() {
  const t = useT()
  const { data: sessions, isLoading, isError, refetch } = useSessionsQuery()

  const terminateSession = useTerminateSession({
    onSuccess: () => toast.success(t('security.sessions.revoked')),
    onError: (err: ApiError) => toast.error(err.message || t('security.sessions.revokeError')),
  })

  const terminateOthers = useTerminateOtherSessions({
    onSuccess: data =>
      toast.success(t('security.sessions.revokedOthers', { count: data.terminatedCount })),
    onError: (err: ApiError) => toast.error(err.message || t('security.sessions.revokeError')),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">{t('security.sessions.loadError')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t('actions.retry')}
        </Button>
      </div>
    )
  }

  const list = sessions ?? []
  const hasOthers = list.some(session => !session.isCurrent)

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {list.map((session: SessionResponse) => {
          const device = describeDevice(session.userAgent)
          const DeviceIcon = device.isMobile ? Smartphone : Monitor
          return (
            <li key={session.id} className="flex items-center gap-3 p-3.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
                <DeviceIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {device.label}
                  </span>
                  {session.isCurrent && (
                    <Badge
                      variant="default"
                      className="bg-success-soft text-success-soft-foreground"
                    >
                      {t('security.sessions.current')}
                    </Badge>
                  )}
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {session.ipAddress ?? '—'} ·{' '}
                  {t('security.sessions.lastActive', {
                    time: formatDistanceToNow(new Date(session.lastUsedAt), { addSuffix: true }),
                  })}
                </p>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => terminateSession.mutate(session.id)}
                  disabled={terminateSession.isPending}
                >
                  <LogOut className="mr-1.5 size-3.5" />
                  {t('security.sessions.revoke')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {hasOthers && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={terminateOthers.isPending}>
                {terminateOthers.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t('security.sessions.revokeOthers')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('security.sessions.revokeOthersTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('security.sessions.revokeOthersDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => terminateOthers.mutate()}>
                  {t('security.sessions.revokeOthers')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

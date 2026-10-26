import { useMemo } from 'react'

import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  MessageSquareQuote,
  UserPlus,
  UserX,
} from 'lucide-react'

import type { Notification, NotificationType } from '@api/services'
import { cn } from '@shared/lib/cn'
import {
  Button,
  EmptyState,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from '@shared/ui'

import { useMarkNotificationsRead, useNotificationsQuery } from '../api'

type NotificationsPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Оформление типа уведомления. Текст собирается на клиенте из типа и payload —
 * в БД лежат подстановки, а не готовая фраза, иначе узбекский и английский
 * интерфейс показывали бы русские строки.
 */
const TYPE_ICON: Partial<Record<NotificationType, typeof Bell>> = {
  MEMBER_JOINED: UserPlus,
  MEMBER_INVITE_DECLINED: UserX,
  REGISTRATION_CREATED: UserPlus,
  REGISTRATION_FIRST: UserPlus,
  EVENT_PUBLISHED: CalendarCheck,
  EVENT_SUBMITTED: CalendarCheck,
}

function notificationText(
  notification: Notification,
  t: ReturnType<typeof useI18n>['t']
): string {
  const payload = (notification.payload ?? {}) as Record<string, string | number>
  const key = `workspace.notifications.types.${notification.type}`
  const text = t(key, payload as never)
  // Неизвестный тип (клиент старее бэкенда) не должен показывать сырой ключ.
  return text === key ? t('workspace.notifications.types.fallback') : text
}

export function NotificationsPanel({ open, onOpenChange }: NotificationsPanelProps) {
  const { t, locale } = useI18n()
  const { data, isLoading } = useNotificationsQuery(open)
  const markRead = useMarkNotificationsRead()

  const notifications = useMemo(() => data?.data ?? [], [data?.data])
  const unread = data?.unread ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('workspace.notifications.title')}</SheetTitle>
          <SheetDescription>
            {unread > 0
              ? t('workspace.notifications.unreadCount', { count: unread })
              : t('workspace.notifications.allRead')}
          </SheetDescription>
        </SheetHeader>

        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full gap-1.5"
            onClick={() => markRead.mutate(undefined)}
            disabled={markRead.isPending}
          >
            <CheckCheck className="size-4" />
            {t('workspace.notifications.markAllRead')}
          </Button>
        )}

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={t('workspace.notifications.emptyTitle')}
              description={t('workspace.notifications.emptyDescription')}
            />
          ) : (
            notifications.map(notification => {
              const Icon = TYPE_ICON[notification.type] ?? Bell
              const reason = (notification.payload as { reason?: string } | null)
                ?.reason
              const isUnread = !notification.readAt
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    isUnread ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  <div className="flex gap-2.5">
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {notificationText(notification, t)}
                      </p>
                      {reason && (
                        <p className="mt-1.5 flex gap-1.5 rounded-md bg-muted/60 px-2.5 py-2 text-[13px] text-foreground">
                          <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 break-words">{reason}</span>
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(notification.createdAt, locale, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

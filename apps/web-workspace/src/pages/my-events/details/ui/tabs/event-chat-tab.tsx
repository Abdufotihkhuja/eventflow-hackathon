import { MessageSquare } from 'lucide-react'

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui'

type EventChatTabProps = {
  eventId: string
}

/**
 * Event chat — placeholder until the messaging backend is ready. Rendered as an
 * honest "coming soon" card rather than a non-functional input.
 */
export function EventChatTab(_props: EventChatTabProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <MessageSquare className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Чат события</CardTitle>
              <CardDescription className="text-xs">Сообщения и объявления участникам</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Скоро</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center">
          <MessageSquare className="size-7 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Чат скоро появится</p>
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Здесь можно будет общаться с участниками и отправлять важные объявления.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

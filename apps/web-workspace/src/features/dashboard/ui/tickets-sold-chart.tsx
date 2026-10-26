import { BarChart3 } from 'lucide-react'

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui'

/**
 * Tickets-sold analytics — placeholder until the backend exposes the data.
 * Rendered as an honest "coming soon" card rather than fabricated numbers.
 */
export function TicketsSoldChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <BarChart3 className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Продажа билетов</CardTitle>
              <CardDescription className="text-xs">Динамика продаж по месяцам</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Скоро</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center">
          <BarChart3 className="size-7 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Аналитика появится позже</p>
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Графики продаж билетов подключим, когда появятся данные.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Скелетон дашборда супер-админа — повторяет реальную сетку,
 * чтобы загрузка не «прыгала».
 */

import { Card, Skeleton } from '@shared/ui'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="space-y-3 px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>

      <Card className="p-0">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid gap-6 px-5 py-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <div className="space-y-4">
          <Card className="space-y-3">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </Card>
          <Card className="space-y-3">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

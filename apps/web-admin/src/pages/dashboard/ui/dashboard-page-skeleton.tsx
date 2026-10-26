import { AdminLayoutSkeleton } from '@widgets/admin-layout'

import { Card, CardContent, CardHeader, Skeleton } from '@shared/ui'

export function DashboardPageSkeleton() {
  return (
    <AdminLayoutSkeleton>
      {/* Hero Section Skeleton */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>
        </div>

        <div className="relative mt-4 flex items-center justify-end gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </section>

      {/* Quick Actions Skeleton */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-48" />
      </section>

      {/* Metrics Grid Skeleton */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={String(idx)} className="border-none bg-background/80 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="size-10 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="space-y-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Main Content Grid Skeleton */}
      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        {/* Activity Feed Skeleton */}
        <Card className="border-none bg-background/80 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={String(idx)}>
                <div className="flex items-start gap-3 p-2">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                </div>
                {idx < 3 && <div className="h-px bg-border/60" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasks Panel Skeleton */}
        <Card className="border-none bg-background/80 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={String(idx)}
                className="rounded-xl border border-dashed border-border bg-muted/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-4 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="size-4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AdminLayoutSkeleton>
  )
}

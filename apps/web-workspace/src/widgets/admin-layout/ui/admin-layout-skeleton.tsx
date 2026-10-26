import { Fragment, type ReactNode } from 'react'

import { Skeleton } from '@shared/ui'

type AdminLayoutSkeletonProps = {
  children?: ReactNode
}

export function AdminLayoutSkeleton({ children }: AdminLayoutSkeletonProps) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-muted/30">
      <aside className="hidden w-64 flex-col border-r border-border bg-background/95 p-6 lg:flex">
        <div className="mb-8 space-y-4">
          <Skeleton className="h-5 w-32 rounded-full bg-brand-primary/20" />
          <Skeleton className="h-12 w-full" />
        </div>
        <nav className="flex-1 space-y-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={String(idx)} className="h-10 w-full rounded-lg" />
          ))}
        </nav>
        <Skeleton className="mt-6 h-12 w-full" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            {children ?? <AdminLayoutDefaultSkeleton />}
          </div>
        </main>
      </div>
    </div>
  )
}

function AdminLayoutDefaultSkeleton() {
  return (
    <Fragment>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={String(idx)} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </Fragment>
  )
}

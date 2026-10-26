import { Fragment, type ReactNode } from 'react'

import { Skeleton } from '@shared/ui'

type AdminLayoutSkeletonProps = {
  children?: ReactNode
}

export function AdminLayoutSkeleton({ children }: AdminLayoutSkeletonProps) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <aside className="hidden w-64 flex-col border-r border-white/[0.07] bg-[#0e0e0d] p-4 lg:flex">
        <div className="mb-6 space-y-3">
          <Skeleton className="h-5 w-28 bg-white/10" />
          <Skeleton className="h-9 w-full bg-white/10" />
        </div>
        <nav className="flex-1 space-y-1.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={String(idx)} className="h-9 w-full rounded-md bg-white/10" />
          ))}
        </nav>
        <Skeleton className="mt-6 h-9 w-full bg-white/10" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b border-border bg-card">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={String(idx)} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </Fragment>
  )
}

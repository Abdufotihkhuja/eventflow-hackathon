import { useT } from '@eventflow/i18n/react'

import { useCurrentUser, isOrganizationUser, isMemberUser } from '@features/profile'
import { Card, CardContent, Skeleton } from '@shared/ui'

import { MemberSettingsView } from './member-settings-view'
import { OrganizationSettingsView } from './organization-settings-view'

export default function SettingsPage() {
  const t = useT()
  const { data: currentUser, isLoading, error } = useCurrentUser()

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{t('profile.errors.loadProfile')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isMemberUser(currentUser)) {
    return <MemberSettingsView member={currentUser.data} />
  }

  if (isOrganizationUser(currentUser)) {
    return <OrganizationSettingsView organization={currentUser.data} />
  }

  if (isLoading) {
    return <SettingsSkeleton />
  }

  return <SettingsSkeleton />
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border pb-6">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <div className="hidden gap-1 lg:flex lg:flex-col">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
